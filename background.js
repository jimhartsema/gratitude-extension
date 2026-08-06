importScripts('sentences.js', 'journal-data.js');

const ALARM_NAME = 'gratitude-reminder';
const JOURNAL_ALARM_NAME = 'journal-badge-check';
const JOURNAL_BADGE_COLOR = '#bf5a2e';
const TEST_NOTIFICATION_PREFIX = 'gratitude-test-';

// Reminders keep waking hours. The alarm fires around the clock and only
// checked that a window was open — but plenty of people leave Chrome running
// overnight, so they woke to a stack of gratitude notifications sent while
// they slept. Nothing kind arrives at 3am.
const DAY_START_HOUR = 8;  // nothing before this
const DAY_END_HOUR = 22;   // nothing from this hour onwards

function isWakingHour(date = new Date()) {
  const hour = date.getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
}

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

chrome.runtime.onInstalled.addListener((details) => {
  setupAlarms();
  updateBadge();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
  updateBadge();
});

// Runs on every service worker wake, not just onStartup/onInstalled.
updateBadge();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === JOURNAL_ALARM_NAME) {
    updateBadge();
    return;
  }

  if (alarm.name !== ALARM_NAME) return;

  // Checked before anything else: an overnight alarm must cost nothing.
  if (!isWakingHour()) return;

  const { enabled = true } = await chrome.storage.sync.get('enabled');
  if (!enabled) return;

  const windows = await chrome.windows.getAll();
  if (windows.length === 0) return;

  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  const written = isEntryComplete(await getJournalEntry(getLocalDateKey()));

  const options = {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    // The bold first line, and the only one guaranteed to be read. It used to
    // say "A little reminder for you", which spent that space on a greeting
    // the Chrome icon beside it already implied. The name earns it back.
    //
    // The unwritten half is only ever added while it is true, so nobody is
    // told to go and do a thing they did this morning. Says "journal" rather
    // than "page" — the word used everywhere in the app — because a banner
    // arrives with no surrounding context to make "page" mean anything.
    title: written ? 'Daily Gratitude' : 'Daily Gratitude · Today’s journal is blank',
    message: sentence,
    // Every reminder asks nothing of anyone now that the journal status lives
    // in the title, so they are all free to slide away on their own.
    requireInteraction: false
  };

  chrome.notifications.create(options);
});

// Every reminder opens the journal. Previously only the standalone nudge did,
// so sixteen sentences a day were dead ends. The setup test is excluded — it
// exists to prove notifications arrive, not to send anyone anywhere.
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
  if (String(notificationId).startsWith(TEST_NOTIFICATION_PREFIX)) return;
  chrome.tabs.create({ url: chrome.runtime.getURL('journal.html') });
});

// journal.js writes directly to chrome.storage.local; this listener wakes
// the service worker on its own so the badge updates immediately (R2/R4)
// without any message-passing between contexts.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[JOURNAL_STORAGE_KEY]) {
    updateBadge();
  }
});
