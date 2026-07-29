/* Popup — a small ledger of today.

   Before writing it shows the date, the day's theme and one of today's real
   questions. After writing it hands the reader their own first line back.
   The hourly sentence deliberately lives only in the notification; repeating
   it here added a second, rerollable copy of a channel that already exists. */

document.addEventListener('DOMContentLoaded', async () => {
  const WEEK_DAYS = 7;

  const todayKey = getLocalDateKey();

  // ---- Today's heading ----
  function prettyDate(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  document.getElementById('today-date').textContent = prettyDate(todayKey);
  document.getElementById('today-theme').textContent = themeForDateKey(todayKey);

  // ---- Written or not ----
  const entry = await getJournalEntry(todayKey);
  const complete = isEntryComplete(entry);
  const firstLine = (entry.grateful || []).find((v) => v && v.trim());

  const taste = document.getElementById('taste');
  const ownLine = document.getElementById('own-line');
  const ownAttrib = document.getElementById('own-attrib');
  const journalLink = document.getElementById('journal-link');
  const journalText = journalLink.querySelector('.journal-link-text');

  if (complete && firstLine) {
    ownLine.textContent = firstLine.trim();
    ownLine.hidden = false;
    ownAttrib.hidden = false;
    journalText.textContent = "Reread today's page";
  } else {
    // A taste of the page rather than a generic line — it is one of the three
    // questions actually waiting on the other side of the link.
    taste.textContent = `“${questionsForDateKey(todayKey)[0]}”`;
    taste.hidden = false;
    journalText.textContent = complete ? "Reread today's page" : "Write today's page";
  }

  journalLink.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('journal.html') });
  });

  // ---- This week ----
  // The calendar week we are actually in, Monday to Sunday — so the dots line
  // up with the themed days, which start on Monday. Filled in, or not.
  (async function renderWeek() {
    const map = await getJournalMap();
    const week = document.getElementById('week');

    const now = new Date();
    const monday = new Date(now);
    // getDay() is 0 for Sunday, so Sunday counts as the 7th day of the week
    // rather than the 1st.
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    let written = 0;
    for (let i = 0; i < WEEK_DAYS; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = getLocalDateKey(d);
      const dot = document.createElement('i');
      const done = isEntryComplete(map[key]);
      if (done) {
        dot.classList.add('is-written');
        written++;
      }
      dot.title = `${d.toLocaleDateString(undefined, { weekday: 'long' })} — ${done ? 'written' : 'not written'}`;
      week.appendChild(dot);
    }

    const label = document.createElement('span');
    label.className = 'week-label';
    label.textContent = 'this week';
    week.appendChild(label);
    week.setAttribute('aria-label', `${written} of ${WEEK_DAYS} days written this week`);
  })();

  // ---- Settings disclosure ----
  const settingsToggle = document.getElementById('settings-toggle');
  const settings = document.getElementById('settings');

  settingsToggle.addEventListener('click', () => {
    const opening = settings.hidden;
    settings.hidden = !opening;
    settingsToggle.setAttribute('aria-expanded', String(opening));
  });

  // ---- Notifications toggle (persisted) ----
  const toggle = document.getElementById('toggle');
  const label = document.getElementById('status-label');

  const { enabled = true } = await chrome.storage.sync.get('enabled');
  toggle.checked = enabled;
  label.textContent = enabled ? 'Notifications on' : 'Notifications off';

  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    chrome.storage.sync.set({ enabled: isEnabled });
    label.textContent = isEnabled ? 'Notifications on' : 'Notifications off';
  });

  // ---- Test notification (single line, mutates in place) ----
  const testBtn = document.getElementById('test-notif');
  const DEFAULT_LABEL = 'not seeing them?';
  let resetTimer = null;
  let awaitingFix = false;

  function openFixPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html?context=fix') });
  }

  function setState(text, variant) {
    testBtn.textContent = text;
    testBtn.classList.toggle('test-link--warn', variant === 'warn');
  }

  testBtn.addEventListener('click', async () => {
    clearTimeout(resetTimer);

    if (awaitingFix) {
      openFixPage();
      return;
    }

    testBtn.disabled = true;
    setState('sending…', null);
    await sendTestNotification();
    testBtn.disabled = false;

    const level = await getNotificationPermissionLevel();
    if (level === 'denied') {
      // Real, confirmed signal — stays until they fix it.
      awaitingFix = true;
      setState('blocked by Chrome — fix', 'warn');
      return;
    }

    setState('sent — check your screen', null);
    resetTimer = setTimeout(() => {
      awaitingFix = true;
      setState('nothing? tap to fix', null);
      resetTimer = setTimeout(() => {
        awaitingFix = false;
        setState(DEFAULT_LABEL, null);
      }, 4000);
    }, 2000);
  });
});
