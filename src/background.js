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

// How many of a day's reminders may say today is unwritten. Waking hours give
// fourteen of them, and fourteen bold lines counting what you haven't done is
// the opposite of what this app is for. The first is a reminder; nobody was
// ever persuaded by the eleventh. After this the sentences go back to being
// gifts, and the toolbar badge carries the status on its own.
const MAX_FLAGGED_PER_DAY = 3;
const NUDGE_STATE_KEY = 'nudgeState';
const SENTENCE_BAG_KEY = 'sentenceBag';

// Both of these live in storage rather than in a variable: MV3 service workers
// are torn down between alarms, so anything held in memory resets itself
// several times a day and neither count would mean anything.

// A shuffled bag rather than a fresh random pick each hour. Fourteen draws
// from sixty sentences repeat within the day about four times in five, and an
// affirmation that arrives twice in an afternoon stops sounding like it was
// meant for you.
async function takeSentence() {
  const { [SENTENCE_BAG_KEY]: state = {} } = await chrome.storage.local.get(SENTENCE_BAG_KEY);
  const last = typeof state.last === 'number' ? state.last : -1;
  let bag = Array.isArray(state.bag)
    ? state.bag.filter((i) => Number.isInteger(i) && i >= 0 && i < SENTENCES.length)
    : [];

  if (bag.length === 0) {
    bag = SENTENCES.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    // The one seam a shuffle can't fix by itself: the last sentence of the old
    // bag landing again as the first of the new one.
    if (bag.length > 1 && bag[bag.length - 1] === last) {
      [bag[bag.length - 1], bag[0]] = [bag[0], bag[bag.length - 1]];
    }
  }

  const index = bag.pop();
  await chrome.storage.local.set({ [SENTENCE_BAG_KEY]: { bag, last: index } });
  return SENTENCES[index];
}

// True while today still has flagged reminders left to spend.
async function claimUnwrittenFlag() {
  const today = getLocalDateKey();
  const { [NUDGE_STATE_KEY]: state = {} } = await chrome.storage.local.get(NUDGE_STATE_KEY);
  const sent = state.date === today ? (state.sent || 0) : 0;
  if (sent >= MAX_FLAGGED_PER_DAY) return false;
  await chrome.storage.local.set({ [NUDGE_STATE_KEY]: { date: today, sent: sent + 1 } });
  return true;
}

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

  const sentence = await takeSentence();
  const written = isEntryComplete(await getJournalEntry(getLocalDateKey()));
  // Claimed only while it would actually be shown, so a day spent written
  // doesn't quietly burn the flags a later unwritten day would want.
  const flagUnwritten = !written && await claimUnwrittenFlag();

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
    //
    // "Waiting" rather than "blank": the same fact, held open as an invitation
    // instead of named as an empty box. A bold line reading "your journal is
    // blank" over a message reading "you are enough, exactly as you are" was
    // two halves of the app arguing with each other.
    title: flagUnwritten ? 'Daily Gratitude · Today’s journal is waiting' : 'Daily Gratitude',
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
