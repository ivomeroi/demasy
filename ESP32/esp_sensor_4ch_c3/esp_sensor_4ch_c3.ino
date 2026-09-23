#include <NimBLEDevice.h>
#include <math.h>

// Cambiar a 1, 2, 3 o 4 antes de cargar cada sensor.
#define SENSOR_NODE_ID 1
#if SENSOR_NODE_ID < 1 || SENSOR_NODE_ID > 4
#error "SENSOR_NODE_ID debe estar entre 1 y 4"
#endif

#define EMG_PIN 0
#define BATTERY_PIN 1
#define BATTERY_LED_PIN 3
#define SAMPLE_RATE_HZ 500
#define BLE_RATE_HZ 100
#define BUFFER_SIZE 128
#define BATTERY_LOW_MV 3400
#define BATTERY_DIVIDER 2.0f       // Divisor resistivo 47k/47k.
#define BATTERY_CALIBRATION 1.00f  // Ajustar comparando con un multimetro.
#define RAW_SHIFT_ARTIFACT_THRESHOLD 500
#define ENVELOPE_ARTIFACT_THRESHOLD 100
#define FLAG_ADC_CLIPPED 0x01
#define FLAG_PRESSURE_ARTIFACT 0x02

#define SENSOR_SERVICE_UUID "7d100001-7e2a-4f21-8b77-2c7a5db10000"
#define SENSOR_DATA_UUID    "7d100002-7e2a-4f21-8b77-2c7a5db10000"

// 16 bytes: funciona incluso con el ATT payload minimo de 20 bytes.
typedef struct __attribute__((packed)) {
  uint8_t nodeId;
  uint32_t seq;
  float signal;
  uint16_t envelope;
  uint16_t raw;
  uint8_t flags;
  uint16_t batteryMv;
} SensorPacket;

static_assert(sizeof(SensorPacket) == 16, "SensorPacket debe ocupar 16 bytes");

NimBLECharacteristic *dataCharacteristic = nullptr;
bool masterConnected = false;
SensorPacket packet = {};
int envelopeBuffer[BUFFER_SIZE] = {};
int envelopeIndex = 0;
long envelopeSum = 0;
float dcOffset = 0.0f;
float latestSignal = 0.0f;
uint16_t latestEnvelope = 0;
uint16_t latestRaw = 0;
uint8_t latestFlags = 0;
uint16_t batteryMv = 0;
bool batteryLow = false;

class SensorServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *, NimBLEConnInfo &) override {
    masterConnected = true;
  }

  void onDisconnect(NimBLEServer *, NimBLEConnInfo &, int) override {
    masterConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

int readEmgADC() {
  long total = 0;
  for (int i = 0; i < 8; i++) total += analogRead(EMG_PIN);
  return total / 8;
}

uint16_t readBatteryMv() {
  uint32_t total = 0;
  for (int i = 0; i < 20; i++) {
    total += analogReadMilliVolts(BATTERY_PIN);
    delayMicroseconds(150);
  }
  const float value = (total / 20.0f) * BATTERY_DIVIDER * BATTERY_CALIBRATION;
  return (uint16_t)constrain((int)value, 0, 5000);
}

int getEnvelope(int absoluteEmg) {
  envelopeSum -= envelopeBuffer[envelopeIndex];
  envelopeBuffer[envelopeIndex] = absoluteEmg;
  envelopeSum += absoluteEmg;
  envelopeIndex = (envelopeIndex + 1) % BUFFER_SIZE;
  return envelopeSum / BUFFER_SIZE;
}

float EMGFilter(float input) {
  float output = input;
  {
    static float z1 = 0, z2 = 0;
    const float x = output - 0.05159732f * z1 - 0.36347401f * z2;
    output = 0.01856301f * x + 0.03712602f * z1 + 0.01856301f * z2;
    z2 = z1;
    z1 = x;
  }
  {
    static float z1 = 0, z2 = 0;
    const float x = output + 0.53945795f * z1 - 0.39764934f * z2;
    output = x - 2.0f * z1 + z2;
    z2 = z1;
    z1 = x;
  }
  {
    static float z1 = 0, z2 = 0;
    const float x = output - 0.47319594f * z1 - 0.70744137f * z2;
    output = x + 2.0f * z1 + z2;
    z2 = z1;
    z1 = x;
  }
  {
    static float z1 = 0, z2 = 0;
    const float x = output + 1.00211112f * z1 - 0.74520226f * z2;
    output = x - 2.0f * z1 + z2;
    z2 = z1;
    z1 = x;
  }
  return output;
}

uint8_t classifySignal(int raw, int envelope) {
  uint8_t flags = 0;
  if (raw <= 50 || raw >= 4000) flags |= FLAG_ADC_CLIPPED;
  if (fabsf(raw - dcOffset) >= RAW_SHIFT_ARTIFACT_THRESHOLD &&
      envelope >= ENVELOPE_ARTIFACT_THRESHOLD) {
    flags |= FLAG_PRESSURE_ARTIFACT;
  }
  return flags;
}

void setupBle() {
  char deviceName[18];
  snprintf(deviceName, sizeof(deviceName), "DEMASY-S%u", SENSOR_NODE_ID);
  NimBLEDevice::init(deviceName);
  NimBLEDevice::setPower(3);

  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new SensorServerCallbacks());
  NimBLEService *service = server->createService(SENSOR_SERVICE_UUID);
  dataCharacteristic = service->createCharacteristic(
    SENSOR_DATA_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY,
    sizeof(SensorPacket)
  );
  server->start();

  NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
  advertising->setName(deviceName);
  advertising->addServiceUUID(SENSOR_SERVICE_UUID);
  advertising->enableScanResponse(true);
  advertising->start();
}

void updateBatteryAndLed() {
  static uint32_t lastRead = 0;
  static uint32_t lastBlink = 0;
  static bool led = false;
  const uint32_t now = millis();

  if (now - lastRead >= 1000) {
    lastRead = now;
    batteryMv = readBatteryMv();
    batteryLow = batteryMv < BATTERY_LOW_MV;
  }

  if (!batteryLow) {
    digitalWrite(BATTERY_LED_PIN, HIGH);
  } else if (now - lastBlink >= 500) {
    lastBlink = now;
    led = !led;
    digitalWrite(BATTERY_LED_PIN, led);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BATTERY_LED_PIN, OUTPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(EMG_PIN, ADC_11db);
  analogSetPinAttenuation(BATTERY_PIN, ADC_11db);

  batteryMv = readBatteryMv();
  long total = 0;
  Serial.println("Mantener el musculo relajado: calibrando...");
  for (int i = 0; i < 1000; i++) {
    total += readEmgADC();
    delay(1);
  }
  dcOffset = total / 1000.0f;

  setupBle();
  Serial.printf(
    "DEMASY-S%u listo, offset=%.2f, bateria=%.2f V\n",
    SENSOR_NODE_ID,
    dcOffset,
    batteryMv / 1000.0f
  );
}

void loop() {
  static uint32_t lastSampleUs = 0;
  static uint32_t lastNotifyUs = 0;
  static uint32_t lastDebugMs = 0;
  const uint32_t nowUs = micros();

  if ((uint32_t)(nowUs - lastSampleUs) >= 1000000UL / SAMPLE_RATE_HZ) {
    lastSampleUs += 1000000UL / SAMPLE_RATE_HZ;
    const int raw = readEmgADC();
    float signal = EMGFilter(raw - dcOffset);
    if (fabsf(signal) < 10.0f) signal = 0.0f;
    const int envelope = getEnvelope((int)fabsf(signal));
    latestRaw = constrain(raw, 0, 4095);
    latestSignal = signal;
    latestEnvelope = constrain(envelope, 0, 4095);
    latestFlags = classifySignal(raw, envelope);
  }

  if (masterConnected && (uint32_t)(nowUs - lastNotifyUs) >= 1000000UL / BLE_RATE_HZ) {
    lastNotifyUs += 1000000UL / BLE_RATE_HZ;
    packet.nodeId = SENSOR_NODE_ID;
    packet.seq++;
    packet.signal = latestSignal;
    packet.envelope = latestEnvelope;
    packet.raw = latestRaw;
    packet.flags = latestFlags;
    packet.batteryMv = batteryMv;
    dataCharacteristic->notify((uint8_t *)&packet, sizeof(packet));
  }

  updateBatteryAndLed();

  if (millis() - lastDebugMs >= 1000) {
    lastDebugMs = millis();
    Serial.printf(
      "node=%u, conectado=%u, raw=%u, signal=%.2f, env=%u, bat=%.2fV\n",
      SENSOR_NODE_ID,
      masterConnected,
      latestRaw,
      latestSignal,
      latestEnvelope,
      batteryMv / 1000.0f
    );
  }
}
