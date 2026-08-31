# Daily Gratitude 🌤️

A tiny Chrome extension that sends you one warm reminder every hour — a small nudge to pause and notice something good in your day.

**→ [Install from the Chrome Web Store](https://chromewebstore.google.com/detail/ljhdeokfmoakelalgdkcgmnikcnhdhdf)**

---

## What it does

Every hour, while Chrome is open, a short message pops up on your screen — something like:

> *"Everything you need is already within you."*

Click the extension icon any time to see a message, tap **another** for a new one, or switch reminders on and off with a single toggle.

That's it. No account. No ads. No data collected. Completely free.

---

## Morning journal

A one-page daily ritual, in the spirit of the Five Minute Journal: three grateful for…, three what-would-make-today-great, one daily affirmation. Open it from the popup ("Today's page") or from the one gentle notification you get on your first browser-open of the day.

- Takes under five minutes. Only the first "grateful for" line is required — a partial page still counts as done.
- Autosaves as you type, so closing the tab never loses your writing.
- One page per day, one notification per day — a small badge on the toolbar icon is the only other reminder, and it disappears the moment you're done.
- Reopen a finished page any time to read it back, with an "Edit" link if you want to change it.

---

## Install

### From the Chrome Web Store
[**Add to Chrome**](https://chromewebstore.google.com/detail/ljhdeokfmoakelalgdkcgmnikcnhdhdf) — done in 10 seconds.

### Manually (for development)
1. Click the green **Code** button on this page → **Download ZIP**
2. Unzip the file on your computer
3. In Chrome, go to `chrome://extensions`
4. Turn on **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked** → select the **`src`** folder inside the unzipped
   folder, not the folder itself — `manifest.json` has to sit at the top of
   whatever you pick
6. Done ✅ Your first reminder arrives within the hour

---

## ⚠️ Important: allow Chrome to send notifications

The reminders won't show up unless your computer allows Chrome to send notifications.

**The extension walks you through this.** On install it opens a guided setup that sends a
test reminder and — if nothing appears — plays a looping, animated walkthrough of the exact
clicks to make, mouse pointer and all, for your operating system. You can reopen it any time
from **test notification** in the popup.

If you'd rather read the steps:

**On Mac:**
1. Open **System Settings** → **Notifications**
2. Find **Google Chrome** in the list
3. Make sure notifications are turned **on**

**On Windows:**
1. Open **Settings** → **System** → **Notifications**
2. Find **Google Chrome** in the list
3. Make sure notifications are turned **on**

If you don't see any reminders after an hour, this is almost always the reason.

---

## Repo layout

```
src/          The extension. This is what Chrome loads and what gets zipped.
site/         Landing page for the QR code and social links (its own README).
test/         Plain-node tests. No runner, no build step: node test/<name>.js
docs/         Design notes and specs.
marketing/    Promo video, store images, business card, social banners.
releases/     Built zips.
```

Only `src/` ships. `marketing/` and `releases/` are kept on disk but out of
git — the video alone is heavier than everything else here combined, and the
zips are all reproducible from `src/`.

To build a release, zip the *contents* of `src/`, not the folder:

```sh
cd src && zip -r ../releases/daily-gratitude-$(node -p "require('./manifest.json').version").zip . -x '.*'
```

## Tests

```sh
node test/quiet-hours.js
```

## Privacy

Daily Gratitude was built with one rule: your data is yours.

**What we collect:** Nothing. Daily Gratitude does not collect, store, or 
transmit any personal information, browsing history, or usage data.

**What stays on your device:** Your on/off preference for the hourly affirmations, 
and anything you write in the morning journal. Journal entries are stored 
locally in your browser only — never transmitted anywhere, never synced to 
an account, never seen by us. Uninstalling the extension deletes them.

**Permissions explained:**
- `alarms` — schedules the hourly affirmation and the daily journal check
- `notifications` — displays the affirmation and journal nudge on your screen
- `storage` — remembers your on/off preference and your journal entries, on-device only

**Third parties:** None. No analytics, no tracking tools, no external 
services of any kind are used.

**Contact:** Questions? Reach out at dailygratitude.contact@gmail.com
