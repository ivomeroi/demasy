# ESP32 USB Serial EMG Input

Run the app from localhost:

```bash
npm start
```

Then open `http://127.0.0.1:8000` in Chrome or Edge. Click **Conectar ESP32**, choose the USB serial device, then click **Iniciar Grabación**.

## Accepted Serial Formats

The browser reads newline-delimited samples at `115200` baud. Each line can be any of these formats:

```text
1234,2030
L:1234,R:2030
{"left":1234,"right":2030}
```

Raw ESP32 ADC values are assumed to be centered around `2048` on a 12-bit ADC and are normalized into the chart's mV-scale view. If you already send small calibrated mV values, for example `0.12,-0.08`, the app uses them directly.

## Minimal ESP32 Example

```cpp
const int LEFT_EMG_PIN = 34;
const int RIGHT_EMG_PIN = 35;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
}

void loop() {
  int left = analogRead(LEFT_EMG_PIN);
  int right = analogRead(RIGHT_EMG_PIN);

  Serial.print(left);
  Serial.print(",");
  Serial.println(right);

  delay(1);
}
```

If your hardware has only one EMG channel, send one value per line. The app will plot it as the left channel and keep the right channel at zero.
