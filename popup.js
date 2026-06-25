document.addEventListener('DOMContentLoaded', async () => {
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
});
