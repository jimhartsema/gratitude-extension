// Shared helpers for testing/troubleshooting notifications.
// Used by both popup.js and welcome.js.

function sendTestNotification() {
  return new Promise((resolve) => {
    chrome.notifications.create(`gratitude-test-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Test reminder',
      message: 'If you can see this, your notifications are working.',
      requireInteraction: false
    }, (id) => resolve(id));
  });
}

function getNotificationPermissionLevel() {
  return new Promise((resolve) => {
    chrome.notifications.getPermissionLevel((level) => resolve(level));
  });
}

function isPinnedToToolbar() {
  return new Promise((resolve) => {
    if (!chrome.action || !chrome.action.getUserSettings) {
      resolve(true); // API unavailable — don't nag if we can't tell.
      return;
    }
    chrome.action.getUserSettings((settings) => resolve(!!settings.isOnToolbar));
  });
}

// One of 'mac' | 'win' | 'cros' | 'linux'.
//
// Ask Chrome rather than sniffing the user agent: navigator.platform reports
// ChromeOS as "Linux x86_64", so a Chromebook used to fall through to 'mac'
// and got told to open the Apple menu. Over half of all installs are ChromeOS.
function detectPlatform() {
  return new Promise((resolve) => {
    if (!chrome.runtime || !chrome.runtime.getPlatformInfo) {
      resolve(guessPlatform());
      return;
    }
    chrome.runtime.getPlatformInfo((info) => {
      const os = (info && info.os) || '';
      if (os === 'win' || os === 'mac' || os === 'cros') resolve(os);
      // openbsd, fuchsia and anything new behave like a Linux desktop for our
      // purposes: a notification daemon we can't give exact steps for.
      else resolve('linux');
    });
  });
}

// Only for a context without chrome.runtime. Can't tell ChromeOS from Linux
// by user agent alone, and says so by preferring the vaguer answer.
function guessPlatform() {
  const raw = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const s = raw.toLowerCase();
  if (s.includes('win')) return 'win';
  if (s.includes('cros') || s.includes('chrome os')) return 'cros';
  if (s.includes('linux')) return 'linux';
  return 'mac';
}
