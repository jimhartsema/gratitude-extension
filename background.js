importScripts('sentences.js', 'journal-data.js');

const ALARM_NAME = 'gratitude-reminder';
const JOURNAL_ALARM_NAME = 'journal-daily-check';
const JOURNAL_NOTIFICATION_ID = 'journal-reminder';
const JOURNAL_BADGE_COLOR = '#bf5a2e';
const MORNING_WINDOW_START_HOUR = 5;

function setupAlarms() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 60,
        periodInMinutes: 60
      });
    }
  });
  chrome.alarms.get(JOURNAL_ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(JOURNAL_ALARM_NAME, {
        periodInMinutes: 30
      });
    }
  });
}

// Keeps the toolbar badge correct any time the service worker wakes up,
// regardless of which event woke it (MV3 service workers are not persistent).
async function updateBadge() {
  const entry = await getJournalEntry(getLocalDateKey());
  const complete = isEntryComplete(entry);
  chrome.action.setBadgeBackgroundColor({ color: JOURNAL_BADGE_COLOR });
  chrome.action.setBadgeText({ text: complete ? '' : '•' });
}

// One gentle nudge per day, and only once the local morning has started —
// never at 00:30 for a night-owl user. Max one notification, guarded by
// lastJournalNudgeDate.
async function maybeSendJournalNudge() {
  // The popup's toggle governs every notification this extension sends — the
  // hourly sentence and this one alike. The badge is not a notification and
  // deliberately keeps working either way.
  const { enabled = true } = await chrome.storage.sync.get('enabled');
  if (!enabled) return;

  const todayKey = getLocalDateKey();
  const entry = await getJournalEntry(todayKey);
  if (isEntryComplete(entry)) return;

  if (new Date().getHours() < MORNING_WINDOW_START_HOUR) return;

  const { lastJournalNudgeDate } = await chrome.storage.local.get('lastJournalNudgeDate');
  if (lastJournalNudgeDate === todayKey) return;

  chrome.notifications.create(JOURNAL_NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Your page is ready',
    message: 'Three questions, five minutes. Start your day.',
    requireInteraction: false
  });

  await chrome.storage.local.set({ lastJournalNudgeDate: todayKey });
}

chrome.runtime.onInstalled.addListener((details) => {
  setupAlarms();
  updateBadge();
  if (details.reason === 'install') {
    // Skip the journal nudge on first install — the welcome tab already
    // covers onboarding; a second prompt at the same moment is noise.
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  } else {
    maybeSendJournalNudge();
  }
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
  updateBadge();
  maybeSendJournalNudge();
});

// Runs on every service worker wake, not just onStartup/onInstalled.
updateBadge();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === JOURNAL_ALARM_NAME) {
    updateBadge();
    maybeSendJournalNudge();
    return;
  }

  if (alarm.name !== ALARM_NAME) return;

  const { enabled = true } = await chrome.storage.sync.get('enabled');
  if (!enabled) return;

  const windows = await chrome.windows.getAll();
  if (windows.length === 0) return;

  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'A little reminder for you',
    message: sentence,
    requireInteraction: false
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId !== JOURNAL_NOTIFICATION_ID) return;
  chrome.tabs.create({ url: chrome.runtime.getURL('journal.html') });
  chrome.notifications.clear(notificationId);
});

// journal.js writes directly to chrome.storage.local; this listener wakes
// the service worker on its own so the badge updates immediately (R2/R4)
// without any message-passing between contexts.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[JOURNAL_STORAGE_KEY]) {
    updateBadge();
  }
});
