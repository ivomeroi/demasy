#include <NimBLEDevice.h>

#define CHANNEL_COUNT 4
#define REQUIRED_CONNECTIONS 5  // Chrome + four sensors
#define STREAM_RATE_HZ 200
#define STALE_TIMEOUT_MS 500
#define STATUS_EVERY_MS 2000

// =========================
// BATERIA DE LA BASE
// =========================
#define BATTERY_PIN 1
#define BATTERY_LED_PIN 3
#define BATTERY_LOW_MV 3400
#define BATTERY_DIVIDER 2.0f       // Divisor resistivo 47k/47k.
#define BATTERY_CALIBRATION 1.00f  // Ajustar comparando con un multimetro.

#define SENSOR_SERVICE_UUID "7d100001-7e2a-4f21-8b77-2c7a5db10000"
#define SENSOR_DATA_UUID    "7d100002-7e2a-4f21-8b77-2c7a5db10000"

#define WEB_SERVICE_UUID    "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define WEB_TX_UUID         "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

#if NIMBLE_MAX_CONNECTIONS < REQUIRED_CONNECTIONS
#error "NimBLE admite menos de 5 conexiones. Configura MYNEWT_VAL_BLE_MAX_CONNECTIONS=6 para toda la libreria."
#endif


// ============================================================
// PAQUETE RECIBIDO DESDE CADA SENSOR
// Debe coincidir exactamente con SensorPacket de los sensores.
// ============================================================

typedef struct __attribute__((packed)) {
  uint8_t nodeId;
  uint32_t seq;
  float signal;
  uint16_t envelope;
  uint16_t raw;
  uint8_t flags;
  uint16_t batteryMv;
} SensorPacket;

static_assert(
  sizeof(SensorPacket) == 16,
  "SensorPacket debe ocupar 16 bytes"
);


// ============================================================
// ESTADO DE CADA SENSOR
// ============================================================

typedef struct {
  bool valid;
  float signal;
  uint16_t envelope;
  uint16_t raw;

  // Bateria recibida desde el sensor
  uint16_t batteryMv;

  uint8_t flags;
  uint32_t seq;
  uint32_t drops;
  uint32_t lastUpdateMs;
} NodeState;


// ============================================================
// VARIABLES GLOBALES
// ============================================================

NodeState nodes[CHANNEL_COUNT] = {};

NimBLEClient *sensorClients[CHANNEL_COUNT] = {};

bool sensorConnected[CHANNEL_COUNT] = {};

NimBLECharacteristic *webTx = nullptr;

NimBLEAdvertisedDevice *pendingDevice = nullptr;

bool webConnected = false;
bool connecting = false;
bool scanRunning = false;


// ============================================================
// BATERIA PROPIA DE LA BASE
// ============================================================

uint16_t baseBatteryMv = 0;
bool baseBatteryLow = false;


portMUX_TYPE dataMux = portMUX_INITIALIZER_UNLOCKED;


// ============================================================
// LECTURA DE BATERIA DE LA BASE
// Misma metodologia utilizada por los sensores.
// ============================================================

uint16_t readBatteryMv() {

  uint32_t total = 0;

  for (int i = 0; i < 20; i++) {

    total += analogReadMilliVolts(BATTERY_PIN);

    delayMicroseconds(150);
  }

  const float value =
    (total / 20.0f)
    * BATTERY_DIVIDER
    * BATTERY_CALIBRATION;

  return (uint16_t)constrain(
    (int)value,
    0,
    5000
  );
}


// ============================================================
// ACTUALIZACION DE BATERIA + LED
// ============================================================

void updateBatteryAndLed() {

  static uint32_t lastRead = 0;
  static uint32_t lastBlink = 0;

  static bool led = false;

  const uint32_t now = millis();


  // Leer bateria una vez por segundo
  if (now - lastRead >= 1000) {

    lastRead = now;

    baseBatteryMv = readBatteryMv();

    baseBatteryLow =
      baseBatteryMv < BATTERY_LOW_MV;
  }


  // Bateria normal:
  // LED encendido permanentemente
  if (!baseBatteryLow) {

    digitalWrite(
      BATTERY_LED_PIN,
      HIGH
    );
  }

  // Bateria baja:
  // LED parpadeando
  else if (now - lastBlink >= 500) {

    lastBlink = now;

    led = !led;

    digitalWrite(
      BATTERY_LED_PIN,
      led
    );
  }
}


// ============================================================
// CONTAR SENSORES CONECTADOS
// ============================================================

uint8_t connectedSensorCount() {

  uint8_t count = 0;

  for (uint8_t i = 0;
       i < CHANNEL_COUNT;
       i++) {

    if (sensorConnected[i]) {
      count++;
    }
  }

  return count;
}


// ============================================================

bool allSensorsConnected() {

  return connectedSensorCount()
         == CHANNEL_COUNT;
}


// ============================================================
// OBTENER ID DEL SENSOR DESDE SU NOMBRE BLE
//
// DEMASY-S1
// DEMASY-S2
// DEMASY-S3
// DEMASY-S4
// ============================================================

int nodeFromName(
  const std::string &name
) {

  if (
    name.size() != 9 ||
    name.rfind("DEMASY-S", 0) != 0
  ) {

    return 0;
  }

  const int id =
    name[8] - '0';

  return (
    id >= 1 &&
    id <= CHANNEL_COUNT
  ) ? id : 0;
}


// ============================================================
// CALLBACKS DEL SERVIDOR BLE PARA LA WEB
// ============================================================

class WebServerCallbacks
  : public NimBLEServerCallbacks {

  void onConnect(
    NimBLEServer *,
    NimBLEConnInfo &
  ) override {

    webConnected = true;

    Serial.println(
      "WEB CONNECTED"
    );
  }


  void onDisconnect(
    NimBLEServer *,
    NimBLEConnInfo &,
    int reason
  ) override {

    webConnected = false;

    Serial.printf(
      "WEB DISCONNECTED reason=%d\n",
      reason
    );

    NimBLEDevice::startAdvertising();
  }
};


// ============================================================
// RECEPCION DE DATOS DESDE LOS SENSORES
// ============================================================

void sensorNotify(
  NimBLERemoteCharacteristic *,
  uint8_t *data,
  size_t length,
  bool
) {

  if (length != sizeof(SensorPacket)) {
    return;
  }


  SensorPacket packet;

  memcpy(
    &packet,
    data,
    sizeof(packet)
  );


  if (
    packet.nodeId < 1 ||
    packet.nodeId > CHANNEL_COUNT
  ) {

    return;
  }


  const uint8_t index =
    packet.nodeId - 1;


  portENTER_CRITICAL(&dataMux);


  NodeState &target =
    nodes[index];


  // Detectar paquetes perdidos
  if (
    target.valid &&
    packet.seq > target.seq + 1
  ) {

    target.drops +=
      packet.seq
      - target.seq
      - 1;
  }


  target.valid = true;

  target.signal =
    packet.signal;

  target.envelope =
    packet.envelope;

  target.raw =
    packet.raw;

  target.flags =
    packet.flags;


  // ----------------------------------
  // BATERIA RECIBIDA DESDE EL SENSOR
  // ----------------------------------

  target.batteryMv =
    packet.batteryMv;


  target.seq =
    packet.seq;

  target.lastUpdateMs =
    millis();


  portEXIT_CRITICAL(&dataMux);
}


// ============================================================
// CALLBACK DE LOS CLIENTES BLE DE LOS SENSORES
// ============================================================

class SensorClientCallbacks
  : public NimBLEClientCallbacks {

  void onDisconnect(
    NimBLEClient *client,
    int reason
  ) override {

    for (
      uint8_t i = 0;
      i < CHANNEL_COUNT;
      i++
    ) {

      if (
        sensorClients[i] != client
      ) {
        continue;
      }


      sensorConnected[i] = false;

      sensorClients[i] = nullptr;


      portENTER_CRITICAL(&dataMux);

      nodes[i].valid = false;

      portEXIT_CRITICAL(&dataMux);


      Serial.printf(
        "SENSOR %u DISCONNECTED reason=%d\n",
        i + 1,
        reason
      );

      break;
    }
  }
};


SensorClientCallbacks sensorCallbacks;


// ============================================================
// CALLBACK DEL ESCANEO BLE
// ============================================================

class ScanCallbacks
  : public NimBLEScanCallbacks {

  void onResult(
    const NimBLEAdvertisedDevice *device
  ) override {

    if (
      connecting ||
      pendingDevice != nullptr ||
      !device->haveName()
    ) {

      return;
    }


    const int id =
      nodeFromName(
        device->getName()
      );


    if (
      id == 0 ||
      sensorConnected[id - 1]
    ) {

      return;
    }


    pendingDevice =
      new NimBLEAdvertisedDevice(
        *device
      );


    NimBLEDevice::getScan()->stop();

    scanRunning = false;
  }
};


ScanCallbacks scanCallbacks;


// ============================================================
// INICIAR ESCANEO DE SENSORES
// ============================================================

void startSensorScanIfNeeded() {

  if (
    !webConnected ||
    connecting ||
    pendingDevice ||
    allSensorsConnected() ||
    scanRunning
  ) {

    return;
  }


  if (
    NimBLEDevice::getScan()
      ->start(0, false, true)
  ) {

    scanRunning = true;

    Serial.printf(
      "SCANNING: %u/4 sensors connected\n",
      connectedSensorCount()
    );
  }

  else {

    Serial.println(
      "ERROR: sensor scan could not start"
    );
  }
}


// ============================================================

void stopSensorScanIfUnneeded() {

  if (
    !scanRunning ||
    (
      webConnected &&
      !allSensorsConnected()
    )
  ) {

    return;
  }


  NimBLEDevice::getScan()->stop();

  scanRunning = false;
}


// ============================================================
// CONEXION A SENSOR PENDIENTE
// ============================================================

bool connectPendingSensor() {

  if (
    !pendingDevice ||
    connecting
  ) {

    return false;
  }


  connecting = true;


  NimBLEAdvertisedDevice *device =
    pendingDevice;

  pendingDevice = nullptr;


  const int expectedId =
    nodeFromName(
      device->getName()
    );


  Serial.printf(
    "CONNECTING DEMASY-S%d...\n",
    expectedId
  );


  NimBLEClient *client =
    NimBLEDevice::createClient();


  if (!client) {

    Serial.printf(
      "ERROR: no BLE client slot "
      "(NIMBLE_MAX_CONNECTIONS=%d)\n",
      NIMBLE_MAX_CONNECTIONS
    );

    delete device;

    connecting = false;

    return false;
  }


  client->setClientCallbacks(
    &sensorCallbacks,
    false
  );


  client->setConnectionParams(
    24,
    40,
    0,
    300
  );


  client->setConnectTimeout(
    6000
  );


  bool ok =
    client->connect(device);


  delete device;


  if (ok) {

    NimBLERemoteService *service =
      client->getService(
        SENSOR_SERVICE_UUID
      );


    NimBLERemoteCharacteristic *data =
      service
      ? service->getCharacteristic(
          SENSOR_DATA_UUID
        )
      : nullptr;


    ok =
      data &&
      data->canNotify() &&
      data->subscribe(
        true,
        sensorNotify
      );
  }


  if (ok) {

    sensorClients[
      expectedId - 1
    ] = client;


    sensorConnected[
      expectedId - 1
    ] = true;


    Serial.printf(
      "SENSOR %d CONNECTED (%u/4)\n",
      expectedId,
      connectedSensorCount()
    );
  }

  else {

    Serial.printf(
      "ERROR: could not connect DEMASY-S%d\n",
      expectedId
    );


    if (client->isConnected()) {

      client->disconnect();
    }


    NimBLEDevice::deleteClient(
      client
    );
  }


  connecting = false;

  return ok;
}


// ============================================================
// SERVIDOR BLE PARA LA PAGINA WEB
// ============================================================

void setupWebBle() {

  NimBLEServer *server =
    NimBLEDevice::createServer();


  server->setCallbacks(
    new WebServerCallbacks()
  );


  NimBLEService *service =
    server->createService(
      WEB_SERVICE_UUID
    );


  webTx =
    service->createCharacteristic(

      WEB_TX_UUID,

      NIMBLE_PROPERTY::READ |
      NIMBLE_PROPERTY::NOTIFY,

      220
    );


  service->start();


  NimBLEAdvertising *advertising =
    NimBLEDevice::getAdvertising();


  advertising->setName(
    "DEMASY-C3"
  );


  advertising->addServiceUUID(
    WEB_SERVICE_UUID
  );


  advertising->enableScanResponse(
    true
  );


  Serial.println(
    advertising->start()

      ? "BLE ADVERTISING OK: DEMASY-C3"

      : "ERROR: BLE advertising could not start"
  );
}


// ============================================================
// ENVIO HACIA LA WEB
//
// FORMATO:
//
// S1signal,S1env,S1flags,
// S2signal,S2env,S2flags,
// S3signal,S3env,S3flags,
// S4signal,S4env,S4flags,
// BaseBattery,
// S1Battery,
// S2Battery,
// S3Battery,
// S4Battery
//
// Las baterias se envian en milivoltios.
// ============================================================

void publishFrame() {

  NodeState channels[
    CHANNEL_COUNT
  ];


  portENTER_CRITICAL(&dataMux);

  memcpy(
    channels,
    nodes,
    sizeof(channels)
  );

  portEXIT_CRITICAL(&dataMux);


  const uint32_t now =
    millis();


  // Comprobar datos desactualizados
  for (
    uint8_t i = 0;
    i < CHANNEL_COUNT;
    i++
  ) {

    if (
      !channels[i].valid ||
      now
        - channels[i].lastUpdateMs
        > STALE_TIMEOUT_MS
    ) {

      channels[i].signal = 0;

      channels[i].envelope = 0;

      channels[i].flags = 0;
    }
  }


  // Aumentado para incluir
  // las cinco baterias
  char line[220];


  const int length =
    snprintf(

      line,
      sizeof(line),

      "%.2f,%u,%u,"
      "%.2f,%u,%u,"
      "%.2f,%u,%u,"
      "%.2f,%u,%u,"
      "%u,%u,%u,%u,%u\n",

      // SENSOR 1
      channels[0].signal,
      channels[0].envelope,
      channels[0].flags,

      // SENSOR 2
      channels[1].signal,
      channels[1].envelope,
      channels[1].flags,

      // SENSOR 3
      channels[2].signal,
      channels[2].envelope,
      channels[2].flags,

      // SENSOR 4
      channels[3].signal,
      channels[3].envelope,
      channels[3].flags,

      // BATERIA DE LA BASE
      baseBatteryMv,

      // BATERIAS DE LOS SENSORES
      channels[0].batteryMv,
      channels[1].batteryMv,
      channels[2].batteryMv,
      channels[3].batteryMv
    );


  if (
    webConnected &&
    webTx &&
    length > 0 &&
    length < (int)sizeof(line)
  ) {

    webTx->notify(
      (uint8_t *)line,
      length
    );
  }
}


// ============================================================
// INFORMACION DE ESTADO POR SERIAL
// ============================================================

void publishStatus() {

  Serial.printf(

    "STATUS "
    "web=%s "
    "sensors=%u/4 "
    "maxConnections=%d "
    "base=%.2fV%s "
    "S1=%s %.2fV "
    "S2=%s %.2fV "
    "S3=%s %.2fV "
    "S4=%s %.2fV\n",

    webConnected
      ? "ON"
      : "OFF",

    connectedSensorCount(),

    NIMBLE_MAX_CONNECTIONS,

    // Bateria de la base
    baseBatteryMv / 1000.0f,

    baseBatteryLow
      ? " LOW"
      : "",

    // Sensor 1
    sensorConnected[0]
      ? "ON"
      : "OFF",

    nodes[0].batteryMv
      / 1000.0f,

    // Sensor 2
    sensorConnected[1]
      ? "ON"
      : "OFF",

    nodes[1].batteryMv
      / 1000.0f,

    // Sensor 3
    sensorConnected[2]
      ? "ON"
      : "OFF",

    nodes[2].batteryMv
      / 1000.0f,

    // Sensor 4
    sensorConnected[3]
      ? "ON"
      : "OFF",

    nodes[3].batteryMv
      / 1000.0f
  );
}


// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(115200);

  delay(500);


  // ---------------------------------
  // Configuracion bateria de la base
  // ---------------------------------

  pinMode(
    BATTERY_LED_PIN,
    OUTPUT
  );


  analogReadResolution(12);


  analogSetPinAttenuation(
    BATTERY_PIN,
    ADC_11db
  );


  // Primera lectura de bateria
  baseBatteryMv =
    readBatteryMv();


  // ---------------------------------
  // BLE
  // ---------------------------------

  NimBLEDevice::init(
    "DEMASY-C3"
  );


  NimBLEDevice::setMTU(
    185
  );


  NimBLEDevice::setPower(
    3
  );


  Serial.printf(
    "NimBLE max connections: %d "
    "(required: %d)\n",

    NIMBLE_MAX_CONNECTIONS,

    REQUIRED_CONNECTIONS
  );


  setupWebBle();


  NimBLEScan *scan =
    NimBLEDevice::getScan();


  scan->setScanCallbacks(
    &scanCallbacks,
    false
  );


  scan->setActiveScan(
    true
  );


  scan->setInterval(
    80
  );


  scan->setWindow(
    40
  );


  // Mostrar bateria inicial
  Serial.printf(
    "Bateria base: %.2f V\n",
    baseBatteryMv / 1000.0f
  );


  Serial.println(
    "MASTER BLE 4CH READY: "
    "connect the DEMASY page"
  );
}


// ============================================================
// LOOP
// ============================================================

void loop() {

  static uint32_t lastFrameMs = 0;

  static uint32_t lastStatusMs = 0;


  // Gestion BLE de los sensores
  stopSensorScanIfUnneeded();


  if (
    pendingDevice &&
    !connecting
  ) {

    connectPendingSensor();
  }


  startSensorScanIfNeeded();


  // ---------------------------------
  // Actualizar bateria de la base
  // ---------------------------------

  updateBatteryAndLed();


  const uint32_t now =
    millis();


  // ---------------------------------
  // Enviar datos hacia la web
  // ---------------------------------

  if (
    now - lastFrameMs
    >= 1000UL / STREAM_RATE_HZ
  ) {

    lastFrameMs = now;

    publishFrame();
  }


  // ---------------------------------
  // Estado por Serial
  // ---------------------------------

  if (
    now - lastStatusMs
    >= STATUS_EVERY_MS
  ) {

    lastStatusMs = now;

    publishStatus();
  }


  delay(1);
}
