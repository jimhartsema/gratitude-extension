/* Popup — today's date, the week's rhythm, and one door into the journal.

   The hourly sentence deliberately lives only in the notification. The
   pre-writing question taste and the post-writing read-back were removed in
   this redesign: the popup's whole job is to point at the page and show the
   week. */

document.addEventListener('DOMContentLoaded', async () => {
  const WEEK_DAYS = 7;
  const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

  // ---- The one call to action ----
  const entry = await getJournalEntry(todayKey);
  const complete = isEntryComplete(entry);

  const ctaTitle = document.getElementById('cta-title');
  const ctaSub = document.getElementById('cta-sub');

  if (complete) {
    ctaTitle.textContent = "Reread today's daily gratitude journal";
    ctaSub.textContent = 'Page written ✓';
  } else {
    ctaTitle.textContent = "Write today's daily gratitude journal";
    ctaSub.textContent = 'Three questions · five minutes';
  }

  document.getElementById('journal-link').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('journal.html') });
  });

  // ---- This week ----
  // Monday to Sunday, so the dots line up with the themed days. Written days
  // fill in; today is an open ring until it is written.
  (async function renderWeek() {
    const map = await getJournalMap();
    const week = document.getElementById('week');
    const labels = document.getElementById('week-labels');

    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    let written = 0;
    for (let i = 0; i < WEEK_DAYS; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = getLocalDateKey(d);
      const done = isEntryComplete(map[key]);
      const isToday = key === todayKey;

      const dot = document.createElement('i');
      if (done) {
        dot.classList.add('is-written');
        written++;
      }
      if (isToday) dot.classList.add('is-today');
      dot.title = `${d.toLocaleDateString(undefined, { weekday: 'long' })} — ${done ? 'written' : 'not written'}`;
      week.appendChild(dot);

      const label = document.createElement('span');
      label.textContent = WEEK_LETTERS[i];
      if (isToday) label.classList.add('is-today');
      labels.appendChild(label);
    }

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
