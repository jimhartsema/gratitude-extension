importScripts('sentences.js', 'journal-data.js');

const ALARM_NAME = 'gratitude-reminder';
const JOURNAL_ALARM_NAME = 'journal-badge-check';
const JOURNAL_BADGE_COLOR = '#bf5a2e';
const MORNING_WINDOW_START_HOUR = 5;
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

// The journal reminder rides the hourly sentence rather than arriving as a
// notification of its own: one fewer interruption a day, and the ask turns up
// wrapped in something pleasant instead of as a bare task prompt.
//
// Returns the sub-line to attach, or null. Consumes the day's allowance when
// it returns a line, so the reminder appears on exactly one sentence a day —
// never on all sixteen, which would read as nagging rather than a nudge.
async function claimJournalReminderLine() {
  const todayKey = getLocalDateKey();

  const entry = await getJournalEntry(todayKey);
  if (isEntryComplete(entry)) return null;

  // Never before the local morning has started, so a night owl at 00:30 is
  // not told their page is blank.
  if (new Date().getHours() < MORNING_WINDOW_START_HOUR) return null;

  const { lastJournalNudgeDate } = await chrome.storage.local.get('lastJournalNudgeDate');
  if (lastJournalNudgeDate === todayKey) return null;

  await chrome.storage.local.set({ lastJournalNudgeDate: todayKey });
  return 'Today’s page is still blank — three questions, five minutes.';
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

  // Checked before anything else, and before the day's journal nudge can be
  // claimed — an overnight alarm must cost nothing, not spend the one reminder
  // this person gets while they are asleep.
  if (!isWakingHour()) return;

  const { enabled = true } = await chrome.storage.sync.get('enabled');
  if (!enabled) return;

  const windows = await chrome.windows.getAll();
  if (windows.length === 0) return;

  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  const reminder = await claimJournalReminderLine();

  const options = {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'A little reminder for you',
    message: sentence,
    // The plain sentences ask nothing, so they slide away on their own. The
    // one a day that carries the journal line stays until it is dealt with —
    // an auto-dismissing banner drops into Notification Center after a few
    // seconds, and a click from there does not reliably reach onClicked.
    requireInteraction: !!reminder
  };
  // A smaller, greyed line under the sentence — present on at most one
  // notification a day, and only while today's page is unwritten.
  if (reminder) options.contextMessage = reminder;

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
