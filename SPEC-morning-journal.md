# Spec: Morning Journal — Daily Gratitude v1.3

A daily gratitude journal ritual built into the existing Daily Gratitude Chrome extension. Written as an implementation spec for Claude Code.

---

## Problem Statement

The user wants a Five-Minute-Journal-style daily ritual (one page, three prompts, every morning) but a paper journal gets lost around the house and the habit breaks. They are on their laptop daily, so the extension — already installed and already sending gratitude reminders — is the reliable place to anchor the ritual. Today the extension only *shows* gratitude messages; it has no way to *write* anything.

## Goals

1. User can complete a one-page morning journal entry (3 prompts) in under 5 minutes.
2. User is reliably made aware each day that today's page is not yet written, without nagging.
3. The habit survives irregular schedules: the trigger fires when the user actually opens the browser, not at a fixed clock time that can be missed.
4. Privacy promise is fully preserved: no account, no backend, no data leaves the device.

## Non-Goals

- **No website / backend / accounts** — would break the extension's core "your data is yours" promise.
- **No journaling inside the popup** — the popup closes on any outside click; wrong container for a 5-minute ritual. The popup only links to the journal page.
- **No evening section** (highlights of the day / what I learned) — v2 (P2). v1 nails the morning anchor only.
- **No new-tab takeover** — strong habit mechanic but invasive; parked deliberately.
- **No multiple daily nag notifications** — one gentle trigger + ambient badge only. Gratitude must not become guilt.

## The Ritual (core UX)

One page per calendar day, keyed by local date `YYYY-MM-DD`. The page shows today's date as a heading and three prompts, matching the Five Minute Journal morning format:

1. **"I am grateful for…"** — 3 short text inputs
2. **"What would make today great?"** — 3 short text inputs
3. **"Daily affirmation — I am…"** — 1 text input

An entry is **complete** when at least the first gratitude field is non-empty and the user has pressed the single **"Done for today"** button. (Don't require all 7 fields — partial pages still count. Perfection kills habits.)

## Requirements

### P0 — Must have

**R1. Journal page (`journal.html` + `journal.css` + `journal.js`)**
- Full-tab extension page, same pattern as the existing `welcome.html` (`chrome.tabs.create({ url: chrome.runtime.getURL('journal.html') })`).
- Visual language matches the existing popup/welcome: Newsreader font, warm palette, calm "paper page" feel. Generous whitespace — it should feel like one page of a nice notebook, not a form.
- Shows today's date, the 3 prompts, and a "Done for today" button.
- If today's entry is already complete, the page shows it in a read-back (view) state with an "edit" affordance, plus a small completed confirmation (e.g., "Page written ✓").
- Acceptance:
  - [ ] Opening journal.html on a new day shows an empty page for today
  - [ ] Reopening after completion shows the saved entry, not an empty form
  - [ ] Layout is clean at common window sizes (≥ 1024px wide; degrade gracefully below)

**R2. Storage & autosave**
- Entries in `chrome.storage.local` (NOT `sync` — sync quota is ~100KB total / 8KB per item, too small for months of entries).
- Schema:
  ```js
  // key: "journal"
  {
    "2026-07-21": {
      grateful: ["", "", ""],
      great: ["", "", ""],
      affirmation: "",
      completedAt: 1753080000000 | null   // null = draft
    },
    ...
  }
  ```
- Autosave draft on every input (debounced ~500ms). Closing the tab mid-entry must never lose text.
- Acceptance:
  - [ ] Type text, close tab, reopen → text is still there (as draft)
  - [ ] "Done for today" sets `completedAt` and updates badge (R4) immediately

**R3. Morning trigger — browser-open, not clock**
- In `background.js`: on `chrome.runtime.onStartup` and on a daily fallback alarm, check whether today's entry is complete.
- If not complete and this is the first check of the day → fire ONE notification: title e.g. "Your page is ready", message e.g. "Three questions, five minutes. Start your day.".
- Clicking the notification opens `journal.html` (`chrome.notifications.onClicked`; give the notification an explicit id like `journal-reminder`).
- Store `lastJournalNudgeDate` in `chrome.storage.local` to guarantee max one journal notification per day.
- Fallback for "Chrome was already open since yesterday" (onStartup won't fire): add a `journal-daily-check` alarm (`periodInMinutes: 30`) that fires the nudge when the local date rolls over and no nudge was sent today.
- Acceptance:
  - [ ] First Chrome open of a new day → exactly one journal notification
  - [ ] Chrome left running overnight → notification still arrives (via alarm) shortly after midnight rollover... but see Open Question Q2 — gate to a "morning window" if decided
  - [ ] Clicking notification opens journal.html; entry complete → no notification that day
  - [ ] Existing hourly quote notifications are unchanged

**R4. Ambient badge**
- `chrome.action.setBadgeText({ text: '1' })` (or '•') while today's entry is incomplete; cleared (`''`) when complete.
- Update on: service worker startup, date rollover (the 30-min alarm), and entry completion.
- Muted badge color from the existing palette (e.g., the terracotta `#bf5a2e`), not alarm-red.
- Acceptance:
  - [ ] Badge visible all day until entry done, then disappears
  - [ ] Badge reappears next day

**R5. Popup doorway**
- Add one row to the existing popup card: state-aware line — "Today's page — not written yet ✎" / "Today's page ✓" — that opens journal.html in a new tab on click.
- Keep the popup otherwise unchanged (sentence, "another", toggle, test notification).
- Acceptance:
  - [ ] Popup line reflects today's completion state
  - [ ] Click opens journal.html

**R6. Manifest / housekeeping**
- Bump version to 1.3. No new permissions are needed (`alarms`, `notifications`, `storage` already granted).
- Update README: describe the journal, and amend the privacy section — journal entries are stored locally on-device only, never transmitted.

### P1 — Nice to have (fast follow, build if trivial)

- **Streak counter**: "🔥 6-day streak" on journal.html (computed from stored entries; a missed day resets — be gentle in copy, no shaming).
- **Past pages**: simple reverse-chronological archive (a "past pages" link on journal.html rendering previous entries read-only). No search, no calendar widget.
- **Afternoon fallback nudge**: if entry still incomplete at ~16:00 local, ONE of the existing hourly quote notifications is replaced with "Your three questions are still waiting — 2 min" (deep-links to journal.html). Max once/day.
- **Journal notification toggle**: separate on/off in popup for journal reminders, independent of the hourly-quotes toggle.

### P2 — Future (do not build; don't block architecturally)

- Evening section (3 amazing things that happened / what I learned) — schema above already leaves room: add `evening: {...}` per date key.
- Export entries (JSON/text download) — keeps privacy promise while preventing lock-in.
- Optional new-tab takeover mode.
- Weekly look-back ("here's what you were grateful for this week").

## User Stories

- As a daily laptop user, I want the journal to open from a morning notification on my first browser-open, so the ritual happens where I already am and can't be "lost like the paper book."
- As a habit-builder, I want a persistent badge on the extension icon until today's page is written, so I stay aware without being nagged.
- As a journaler, I want my half-typed entry to survive closing the tab, so I never lose writing.
- As a privacy-conscious user, I want all entries stored only on my device, so the extension's no-data promise stays true.
- As a returning user, I want to see today's completed page when I reopen it, so I get a small moment of satisfaction instead of an empty form.

## Success Metrics

No analytics exist (by design — privacy). Success is assessed locally/self-reported:
- Leading: user completes ≥5 of first 7 days (streak counter makes this self-evident).
- Lagging: ritual still alive after 30 days; qualitative "did this replace the paper book?"

## Open Questions

- **Q1 (product, non-blocking):** Notification copy and journal page microcopy — draft during implementation, keep tone consistent with existing sentences.js voice (warm, no exclamation marks).
- **Q2 (product, blocking for R3):** Should the date-rollover nudge be gated to a morning window (e.g., only fire between 05:00–12:00 local) so a midnight-working user isn't nudged at 00:30? **Recommendation: yes, gate it; before 05:00 wait, after 12:00 still fire (better late than never).**
- **Q3 (design, non-blocking):** Exact badge glyph ('1' vs '•') and completed-state visual on the page — decide in implementation.

## Implementation Notes for Claude Code

- Existing files: `manifest.json` (MV3), `background.js` (service worker, hourly alarm + notifications), `popup.html/js/css`, `sentences.js`, `welcome.html/js/css`, `notify.js`.
- New files: `journal.html`, `journal.css`, `journal.js`. Modified: `background.js`, `popup.html/js/css`, `manifest.json`, `README.md`.
- Date handling: always local time, key = `YYYY-MM-DD` from local date parts (do NOT use `toISOString()` — it's UTC and breaks the day boundary).
- Service worker is not persistent (MV3): all state in `chrome.storage.local`; badge must be re-set on worker wake (e.g., in a top-level init that runs on any event).
- Keep the existing hourly reminder logic untouched except where P1 afternoon-nudge explicitly modifies it.
