document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('toggle');
  const label = document.getElementById('status-label');
  const sentenceEl = document.getElementById('sentence');
  const anotherBtn = document.getElementById('another');

  // ---- Notifications toggle (persisted) ----
  const { enabled = true } = await chrome.storage.sync.get('enabled');
  toggle.checked = enabled;
  label.textContent = enabled ? 'Notifications on' : 'Notifications off';

  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    chrome.storage.sync.set({ enabled: isEnabled });
    label.textContent = isEnabled ? 'Notifications on' : 'Notifications off';
  });

  // ---- Hero sentence + "another" ----
  let current = -1;

  function showRandomSentence() {
    if (!Array.isArray(SENTENCES) || SENTENCES.length === 0) return;
    let next = current;
    while (next === current && SENTENCES.length > 1) {
      next = Math.floor(Math.random() * SENTENCES.length);
    }
    current = next;
    sentenceEl.textContent = SENTENCES[current];
  }

  showRandomSentence();
  anotherBtn.addEventListener('click', showRandomSentence);

  // ---- Test notification (single line, mutates in place) ----
  const testBtn = document.getElementById('test-notif');
  const DEFAULT_LABEL = 'test notification';
  let resetTimer = null;
  let awaitingFix = false;

  function openFixPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html?context=fix') });
  }

  function setState(text, variant) {
    testBtn.textContent = text;
    testBtn.classList.toggle('test-link--hint', variant === 'hint');
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
      setState('notifications blocked — tap to fix', 'warn');
      return;
    }

    setState('sent ✓', null);
    resetTimer = setTimeout(() => {
      awaitingFix = true;
      setState("didn't see it? tap to fix", 'hint');
      resetTimer = setTimeout(() => {
        awaitingFix = false;
        setState(DEFAULT_LABEL, null);
      }, 4000);
    }, 2000);
  });
});
