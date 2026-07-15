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

function detectPlatform() {
  const raw = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  return raw.toLowerCase().includes('win') ? 'win' : 'mac';
}
