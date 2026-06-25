# Daily Gratitude — Chrome Extension

A Chrome extension that sends you a warm, joyful notification every hour while your browser is open — so you never feel alone, and always feel reminded of the good in your life.

## Features

- Hourly native notifications with uplifting messages
- 100 hand-curated warm and joyful sentences
- Simple on/off toggle — no clutter, no settings overload
- Fully offline — no API calls, no costs, no data collection

## Install (Developer Mode)

1. Download or clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. Done — you'll receive your first reminder within the hour

## How It Works

The extension uses Chrome's `alarms` API to fire every 60 minutes. When the alarm fires, it checks that at least one browser window is open, then picks a random sentence from the local list and sends a native OS notification. No internet connection required.

## Project Structure

```
gratitude-extension/
├── manifest.json       # Chrome Extension Manifest V3
├── background.js       # Service worker — alarm setup and notification logic
├── sentences.js        # 100 curated warm sentences
├── popup.html          # Extension popup UI
├── popup.css           # Popup styles
├── popup.js            # Popup toggle logic
└── icons/              # Extension icons (16, 48, 128px)
```

## Coming Soon

- Chrome Web Store listing
- Custom notification schedule
- Themed icon designs

## License

MIT
