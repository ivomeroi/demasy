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
#define CHANNEL_COUNT 4
#define STREAM_RATE_HZ 200
#define STALE_TIMEOUT_MS 500
#define STATUS_EVERY_MS 2000
#define BLE_DEVICE_NAME "DEMASY-Master"
#define BLE_SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_TX_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_BATCH_LINES 2
#define BLE_BATCH_SIZE 180

// Node IDs: 1 flexor izquierdo, 2 flexor derecho,
//           3 extensor izquierdo, 4 extensor derecho.
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
  uint32_t drops;
  unsigned long lastUpdateMs;
} NodeState;

NodeState channels[CHANNEL_COUNT] = {};
uint32_t receivedPackets = 0;
uint32_t unknownNodePackets = 0;
uint32_t badSizePackets = 0;
uint32_t bleNotifications = 0;
char outputLine[220];
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
    bleBatchLen = 0;
    bleBatchLines = 0;
    Serial.println("BLE DISCONNECTED");
    server->startAdvertising();
  }
};

bool active(const NodeState &state) {
  return state.valid && (millis() - state.lastUpdateMs) <= STALE_TIMEOUT_MS;
}

void flushBleBatch() {
  if (!bleClientConnected || bleTxCharacteristic == nullptr || bleBatchLen == 0) {
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

void publishBleLine(const char *line) {
  if (!bleClientConnected || bleTxCharacteristic == nullptr) return;
  const size_t length = strlen(line);
  if (bleBatchLen + length >= sizeof(bleBatch)) flushBleBatch();
  if (length >= sizeof(bleBatch)) return;
  memcpy(bleBatch + bleBatchLen, line, length);
  bleBatchLen += length;
  bleBatchLines++;
  if (bleBatchLines >= BLE_BATCH_LINES) flushBleBatch();
}

void publishCombinedFrame() {
  float signal[CHANNEL_COUNT];
  uint16_t envelope[CHANNEL_COUNT];
  uint8_t flags[CHANNEL_COUNT];
  for (uint8_t index = 0; index < CHANNEL_COUNT; index++) {
    const bool available = active(channels[index]);
    signal[index] = available ? channels[index].signal : 0.0f;
    envelope[index] = available ? channels[index].envelope : 0;
    flags[index] = available ? channels[index].flags : 0;
  }

  // Stable CSV contract: FL,envFL,flagsFL,FR,envFR,flagsFR,EL,envEL,flagsEL,ER,envER,flagsER
  snprintf(outputLine, sizeof(outputLine),
    "%.2f,%u,%u,%.2f,%u,%u,%.2f,%u,%u,%.2f,%u,%u\n",
    signal[0], envelope[0], flags[0], signal[1], envelope[1], flags[1],
    signal[2], envelope[2], flags[2], signal[3], envelope[3], flags[3]);
  Serial.print(outputLine);
  publishBleLine(outputLine);
}

void publishStatus() {
  snprintf(outputLine, sizeof(outputLine),
    "status,seqFL=%lu,seqFR=%lu,seqEL=%lu,seqER=%lu,dropFL=%lu,dropFR=%lu,dropEL=%lu,dropER=%lu,bad=%lu,unknown=%lu,ble=%lu",
    (unsigned long)channels[0].seq, (unsigned long)channels[1].seq,
    (unsigned long)channels[2].seq, (unsigned long)channels[3].seq,
    (unsigned long)channels[0].drops, (unsigned long)channels[1].drops,
    (unsigned long)channels[2].drops, (unsigned long)channels[3].drops,
    (unsigned long)badSizePackets, (unsigned long)unknownNodePackets,
    (unsigned long)bleNotifications);
  Serial.println(outputLine);
}

#if ESP_IDF_VERSION_MAJOR >= 5
void onEspNowRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  (void)info;
#else
void onEspNowRecv(const uint8_t *mac, const uint8_t *data, int len) {
  (void)mac;
#endif
  if (len != (int)sizeof(EMGPacket)) { badSizePackets++; return; }
  EMGPacket packet;
  memcpy(&packet, data, sizeof(packet));
  receivedPackets++;
  if (packet.nodeId < 1 || packet.nodeId > CHANNEL_COUNT) { unknownNodePackets++; return; }
  NodeState &target = channels[packet.nodeId - 1];
  if (target.valid && packet.seq > target.seq + 1) target.drops += packet.seq - target.seq - 1;
  target.valid = true;
  target.signal = packet.signal;
  target.envelope = packet.envelope;
  target.seq = packet.seq;
  target.tMicros = packet.tMicros;
  target.raw = packet.raw;
  target.flags = packet.flags;
  target.lastUpdateMs = millis();
}

void setupBle() {
  BLEDevice::init(BLE_DEVICE_NAME);
  BLEDevice::setMTU(185);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(BLE_SERVICE_UUID);
  bleTxCharacteristic = service->createCharacteristic(BLE_TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  bleTxCharacteristic->addDescriptor(new BLE2902());
  service->start();
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BLE_SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.print("BLE READY name=");
  Serial.println(BLE_DEVICE_NAME);
}

void setupEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(WIFI_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) { Serial.println("ERROR: ESP-NOW init"); return; }
  esp_now_register_recv_cb(onEspNowRecv);
  Serial.print("ESP-NOW READY channel=");
  Serial.println(WIFI_CHANNEL);
}

void setup() {
  Serial.begin(BAUD_RATE);
  delay(500);
  setupBle();
  setupEspNow();
  Serial.println("MASTER 4CH READY");
}

void loop() {
  static unsigned long lastStreamMs = 0;
  static unsigned long lastStatusMs = 0;
  const unsigned long now = millis();
  if (now - lastStreamMs >= 1000 / STREAM_RATE_HZ) {
    lastStreamMs = now;
    publishCombinedFrame();
  }
  if (now - lastStatusMs >= STATUS_EVERY_MS) {
    lastStatusMs = now;
    publishStatus();
  }
}
