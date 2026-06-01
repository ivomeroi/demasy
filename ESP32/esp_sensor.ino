#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <esp_idf_version.h>
#include <math.h>

#define SAMPLE_RATE 500
#define BAUD_RATE 115200
#define INPUT_PIN 0
#define BUFFER_SIZE 128
#define SLAVE_ID 1
#define WIFI_CHANNEL 1
#define DEBUG_EVERY_MS 1000
#define RAW_SHIFT_ARTIFACT_THRESHOLD 500
#define ENVELOPE_ARTIFACT_THRESHOLD 100
#define FLAG_ADC_CLIPPED 0x01
#define FLAG_PRESSURE_ARTIFACT 0x02

int circular_buffer[BUFFER_SIZE] = {0};
int data_index = 0;
long sum = 0;

float dcOffset = 0;
uint32_t sentOk = 0;
uint32_t sentFail = 0;
uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

typedef struct __attribute__((packed)) {
  uint8_t nodeId;
  uint32_t seq;
  float signal;
  uint16_t envelope;
  uint32_t tMicros;
  uint16_t raw;
  uint8_t flags;
} EMGPacket;

EMGPacket txPacket = {0};

#if ESP_IDF_VERSION_MAJOR >= 5
void onEspNowSent(const wifi_tx_info_t *tx_info, esp_now_send_status_t status) {
  (void)tx_info;
  if (status == ESP_NOW_SEND_SUCCESS) sentOk++;
  else sentFail++;
}
#else
void onEspNowSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  (void)mac_addr;
  if (status == ESP_NOW_SEND_SUCCESS) sentOk++;
  else sentFail++;
}
#endif

void setupEspNow();
void sendPacket(float signal, int envelope, int raw, uint8_t flags);
uint8_t classifySignal(int raw, float signal, int envelope);


int readADC()
{
  long adc = 0;

  for(int i = 0; i < 8; i++)
  {
    adc += analogRead(INPUT_PIN);
  }

  return adc / 8;
}

void setup()
{
  Serial.begin(BAUD_RATE);
  delay(1000);
  Serial.println("SENSOR BOOT");

  setupEspNow();

  analogReadResolution(12);
  analogSetPinAttenuation(INPUT_PIN, ADC_11db);

  long offsetSum = 0;

  for(int i=0;i<1000;i++)
  {
    offsetSum += readADC();
    delay(1);
  }

  dcOffset = offsetSum / 1000.0;
  Serial.print("EMG READY node=");
  Serial.print(SLAVE_ID);
  Serial.print(",pin=");
  Serial.print(INPUT_PIN);
  Serial.print(",offset=");
  Serial.println(dcOffset, 2);
}

void loop()
{
  static unsigned long lastMicros = 0;
  if(micros() - lastMicros >= (1000000 / SAMPLE_RATE))
  {
    lastMicros += (1000000 / SAMPLE_RATE);
    int raw = readADC();
    float centered = raw - dcOffset;
    float signal = EMGFilter(centered);

    if(fabsf(signal) < 10)
    {
      signal = 0;
    }
    int envelope = getEnvelope((int)fabsf(signal));
    uint8_t flags = classifySignal(raw, signal, envelope);

    sendPacket(signal, envelope, raw, flags);

    static unsigned long lastDebugMs = 0;
    const unsigned long nowMs = millis();
    if (nowMs - lastDebugMs >= DEBUG_EVERY_MS)
    {
      lastDebugMs = nowMs;
      Serial.print("node=");
      Serial.print(SLAVE_ID);
      Serial.print(",raw=");
      Serial.print(raw);
      Serial.print(",signal=");
      Serial.print(signal, 2);
      Serial.print(",envelope=");
      Serial.print(envelope);
      Serial.print(",flags=");
      Serial.print(flags);
      Serial.print(",sentOk=");
      Serial.print(sentOk);
      Serial.print(",sentFail=");
      Serial.println(sentFail);
    }
  }
}

void setupEspNow()
{
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(WIFI_CHANNEL, WIFI_SECOND_CHAN_NONE);

  if (esp_now_init() != ESP_OK)
  {
    Serial.println("ERROR: ESP-NOW init");
    return;
  }

  esp_now_register_send_cb(onEspNowSent);

  esp_now_peer_info_t peerInfo = {};
  for (int i = 0; i < 6; i++)
  {
    peerInfo.peer_addr[i] = broadcastAddress[i];
  }
  peerInfo.channel = WIFI_CHANNEL;
  peerInfo.encrypt = false;
  peerInfo.ifidx = WIFI_IF_STA;

  if (!esp_now_is_peer_exist(peerInfo.peer_addr))
  {
    if (esp_now_add_peer(&peerInfo) != ESP_OK)
    {
      Serial.println("ERROR: ESP-NOW peer");
      return;
    }
  }

  Serial.print("ESP-NOW READY channel=");
  Serial.println(WIFI_CHANNEL);
}

void sendPacket(float signal, int envelope, int raw, uint8_t flags)
{
  txPacket.nodeId = SLAVE_ID;
  txPacket.seq++;
  txPacket.signal = signal;
  txPacket.envelope = (uint16_t)max(0, min(4095, envelope));
  txPacket.tMicros = micros();
  txPacket.raw = (uint16_t)max(0, min(4095, raw));
  txPacket.flags = flags;

  esp_now_send(broadcastAddress, (uint8_t *)&txPacket, sizeof(txPacket));
}

uint8_t classifySignal(int raw, float signal, int envelope)
{
  (void)signal;
  uint8_t flags = 0;

  if (raw <= 50 || raw >= 4000)
  {
    flags |= FLAG_ADC_CLIPPED;
  }

  const float rawShift = fabsf(raw - dcOffset);
  if (rawShift >= RAW_SHIFT_ARTIFACT_THRESHOLD && envelope >= ENVELOPE_ARTIFACT_THRESHOLD)
  {
    flags |= FLAG_PRESSURE_ARTIFACT;
  }

  return flags;
}

int getEnvelope(int abs_emg)
{
  sum -= circular_buffer[data_index];

  sum += abs_emg;

  circular_buffer[data_index] = abs_emg;

  data_index++;

  if(data_index >= BUFFER_SIZE)
  {
    data_index = 0;
  }

  return sum / BUFFER_SIZE;
}

float EMGFilter(float input)
{
  float output = input;

  {
    static float z1, z2;
    float x = output - 0.05159732*z1 - 0.36347401*z2;
    output = 0.01856301*x + 0.03712602*z1 + 0.01856301*z2;
    z2 = z1;
    z1 = x;
  }

  {
    static float z1, z2;
    float x = output + 0.53945795*z1 - 0.39764934*z2;
    output = x - 2.0*z1 + z2;
    z2 = z1;
    z1 = x;
  }

  {
    static float z1, z2;
    float x = output - 0.47319594*z1 - 0.70744137*z2;
    output = x + 2.0*z1 + z2;
    z2 = z1;
    z1 = x;
  }

  {
    static float z1, z2;
    float x = output + 1.00211112*z1 - 0.74520226*z2;
    output = x - 2.0*z1 + z2;
    z2 = z1;
    z1 = x;
  }

  return output;
}
