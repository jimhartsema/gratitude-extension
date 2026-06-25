importScripts('sentences.js');

const ALARM_NAME = 'gratitude-reminder';

function setupAlarm() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 60,
        periodInMinutes: 60
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(setupAlarm);
chrome.runtime.onStartup.addListener(setupAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const { enabled = true } = await chrome.storage.sync.get('enabled');
  if (!enabled) return;

  const windows = await chrome.windows.getAll();
  if (windows.length === 0) return;

  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'A little reminder for you',
    message: sentence,
    requireInteraction: false
  });
});
