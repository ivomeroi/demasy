#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <esp_idf_version.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define BAUD_RATE 115200
#define WIFI_CHANNEL 1
#define NODE_LEFT 1
#define NODE_RIGHT 2
#define STREAM_RATE_HZ 200
#define STALE_TIMEOUT_MS 500
#define STATUS_EVERY_MS 2000
#define BLE_DEVICE_NAME "KinesioEMG-Master"
#define BLE_SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_TX_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_BATCH_LINES 4
#define BLE_BATCH_SIZE 180
#define FLAG_ADC_CLIPPED 0x01
#define FLAG_PRESSURE_ARTIFACT 0x02

typedef struct __attribute__((packed)) {
  uint8_t nodeId;
  uint32_t seq;
  float signal;
  uint16_t envelope;
  uint32_t tMicros;
  uint16_t raw;
  uint8_t flags;
} EMGPacket;

typedef struct {
  bool valid;
  float signal;
  uint16_t envelope;
  uint32_t seq;
  uint32_t tMicros;
  uint16_t raw;
  uint8_t flags;
  unsigned long lastUpdateMs;
} NodeState;

NodeState leftState = {false, 0, 0, 0, 0, 0, 0, 0};
NodeState rightState = {false, 0, 0, 0, 0, 0, 0, 0};
uint32_t unknownNodePackets = 0;
uint32_t badSizePackets = 0;
uint32_t leftDrops = 0;
uint32_t rightDrops = 0;
uint32_t receivedPackets = 0;
uint32_t bleNotifications = 0;
char outLine[128];
char bleLine[80];
char bleBatch[BLE_BATCH_SIZE];
size_t bleBatchLen = 0;
uint8_t bleBatchLines = 0;
BLECharacteristic *bleTxCharacteristic = nullptr;
bool bleClientConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) {
    (void)server;
    bleClientConnected = true;
    Serial.println("BLE CONNECTED");
  }

  void onDisconnect(BLEServer *server) {
    bleClientConnected = false;
    Serial.println("BLE DISCONNECTED");
    server->startAdvertising();
  }
};

void setupEspNow();
void setupBle();
void publishBleData(float leftSignal, float rightSignal, uint16_t leftEnv, uint16_t rightEnv, uint8_t leftFlags, uint8_t rightFlags);
void flushBleBatch();
#if ESP_IDF_VERSION_MAJOR >= 5
void onEspNowRecv(const esp_now_recv_info_t *recvInfo, const uint8_t *incomingData, int len);
#else
void onEspNowRecv(const uint8_t *mac, const uint8_t *incomingData, int len);
#endif
void publishCombinedFrame();
bool isStale(const NodeState &state);
void publishStatus();

void setup()
{
  Serial.begin(BAUD_RATE);
  setupBle();
  setupEspNow();
  Serial.println("MASTER READY");
}

void loop()
{
  static unsigned long lastStreamMs = 0;
  static unsigned long lastStatusMs = 0;
  const unsigned long now = millis();
  const unsigned long intervalMs = 1000 / STREAM_RATE_HZ;

  if (now - lastStreamMs >= intervalMs)
  {
    lastStreamMs = now;
    publishCombinedFrame();
  }

  if (now - lastStatusMs >= STATUS_EVERY_MS)
  {
    lastStatusMs = now;
    publishStatus();
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

  esp_now_register_recv_cb(onEspNowRecv);
}

void setupBle()
{
  BLEDevice::init(BLE_DEVICE_NAME);
  BLEDevice::setMTU(185);

  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(BLE_SERVICE_UUID);
  bleTxCharacteristic = service->createCharacteristic(
    BLE_TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  bleTxCharacteristic->addDescriptor(new BLE2902());

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BLE_SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.print("BLE READY name=");
  Serial.println(BLE_DEVICE_NAME);
}

#if ESP_IDF_VERSION_MAJOR >= 5
void onEspNowRecv(const esp_now_recv_info_t *recvInfo, const uint8_t *incomingData, int len)
{
  (void)recvInfo;
#else
void onEspNowRecv(const uint8_t *mac, const uint8_t *incomingData, int len)
{
  (void)mac;
#endif

  if (len != (int)sizeof(EMGPacket))
  {
    badSizePackets++;
    return;
  }

  EMGPacket packet;
  memcpy(&packet, incomingData, sizeof(packet));
  receivedPackets++;

  NodeState *target = nullptr;
  if (packet.nodeId == NODE_LEFT) target = &leftState;
  if (packet.nodeId == NODE_RIGHT) target = &rightState;
  if (target == nullptr) {
    unknownNodePackets++;
    return;
  }

  if (target->valid && packet.seq > target->seq + 1)
  {
    const uint32_t dropped = packet.seq - target->seq - 1;
    if (packet.nodeId == NODE_LEFT) leftDrops += dropped;
    if (packet.nodeId == NODE_RIGHT) rightDrops += dropped;
  }

  target->valid = true;
  target->signal = packet.signal;
  target->envelope = packet.envelope;
  target->seq = packet.seq;
  target->tMicros = packet.tMicros;
  target->raw = packet.raw;
  target->flags = packet.flags;
  target->lastUpdateMs = millis();
}

void publishCombinedFrame()
{
  const bool leftActive = leftState.valid && !isStale(leftState);
  const bool rightActive = rightState.valid && !isStale(rightState);

  const float leftSignal = leftActive ? leftState.signal : 0.0f;
  const float rightSignal = rightActive ? rightState.signal : 0.0f;
  const uint16_t leftEnv = leftActive ? leftState.envelope : 0;
  const uint16_t rightEnv = rightActive ? rightState.envelope : 0;
  const uint8_t leftFlags = leftActive ? leftState.flags : 0;
  const uint8_t rightFlags = rightActive ? rightState.flags : 0;

  snprintf(
    outLine,
    sizeof(outLine),
    "left=%.2f,right=%.2f,envL=%u,envR=%u,flagsL=%u,flagsR=%u",
    leftSignal,
    rightSignal,
    leftEnv,
    rightEnv,
    leftFlags,
    rightFlags
  );
  publishBleData(leftSignal, rightSignal, leftEnv, rightEnv, leftFlags, rightFlags);
}

bool isStale(const NodeState &state)
{
  return (millis() - state.lastUpdateMs) > STALE_TIMEOUT_MS;
}

void publishStatus()
{
  snprintf(
    outLine,
    sizeof(outLine),
    "status,leftSeq=%lu,rightSeq=%lu,leftDrops=%lu,rightDrops=%lu,badSize=%lu,unknown=%lu",
    (unsigned long)leftState.seq,
    (unsigned long)rightState.seq,
    (unsigned long)leftDrops,
    (unsigned long)rightDrops,
    (unsigned long)badSizePackets,
    (unsigned long)unknownNodePackets
  );
  Serial.println(outLine);
  snprintf(
    outLine,
    sizeof(outLine),
    "debug,rx=%lu,bleConnected=%u,bleNotify=%lu,lastBle=%s",
    (unsigned long)receivedPackets,
    bleClientConnected ? 1 : 0,
    (unsigned long)bleNotifications,
    bleLine
  );
  Serial.println(outLine);
}

void publishBleData(float leftSignal, float rightSignal, uint16_t leftEnv, uint16_t rightEnv, uint8_t leftFlags, uint8_t rightFlags)
{
  if (!bleClientConnected || bleTxCharacteristic == nullptr)
  {
    return;
  }

  snprintf(
    bleLine,
    sizeof(bleLine),
    "%d,%u,%u,%d,%u,%u\n",
    (int)leftSignal,
    (unsigned int)leftEnv,
    (unsigned int)leftFlags,
    (int)rightSignal,
    (unsigned int)rightEnv,
    (unsigned int)rightFlags
  );

  const size_t lineLen = strlen(bleLine);
  if (bleBatchLen + lineLen >= sizeof(bleBatch))
  {
    flushBleBatch();
  }

  memcpy(bleBatch + bleBatchLen, bleLine, lineLen);
  bleBatchLen += lineLen;
  bleBatchLines++;

  if (bleBatchLines >= BLE_BATCH_LINES)
  {
    flushBleBatch();
  }
}

void flushBleBatch()
{
  if (!bleClientConnected || bleTxCharacteristic == nullptr || bleBatchLen == 0)
  {
    bleBatchLen = 0;
    bleBatchLines = 0;
    return;
  }

  bleTxCharacteristic->setValue((uint8_t *)bleBatch, bleBatchLen);
  bleTxCharacteristic->notify();
  bleNotifications++;
  bleBatchLen = 0;
  bleBatchLines = 0;
}
