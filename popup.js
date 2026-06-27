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
});
