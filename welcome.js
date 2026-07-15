document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const isFixContext = params.get('context') === 'fix';

  const heading = document.getElementById('heading');
  const subtext = document.getElementById('subtext');
  const testBtn = document.getElementById('test-btn');
  const statusLine = document.getElementById('status-line');
  const notSeenLink = document.getElementById('not-seen-link');
  const fixSection = document.getElementById('fix-section');
  const chromeNote = document.getElementById('chrome-note');
  const macSteps = document.getElementById('mac-steps');
  const winSteps = document.getElementById('win-steps');
  const tabMac = document.getElementById('tab-mac');
  const tabWin = document.getElementById('tab-win');
  const pinTip = document.getElementById('pin-tip');

  if (isFixContext) {
    heading.textContent = "Let's fix your notifications";
    subtext.textContent = "Send a test reminder below, then follow the steps if it doesn't show up.";
  }

  function showPlatform(platform) {
    macSteps.hidden = platform !== 'mac';
    winSteps.hidden = platform !== 'win';
    tabMac.classList.toggle('active', platform === 'mac');
    tabWin.classList.toggle('active', platform === 'win');
  }

  showPlatform(detectPlatform());
  tabMac.addEventListener('click', () => showPlatform('mac'));
  tabWin.addEventListener('click', () => showPlatform('win'));

  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = 'Sending…';

    await sendTestNotification();

    testBtn.textContent = 'Send another test';
    testBtn.disabled = false;
    statusLine.hidden = false;
    notSeenLink.hidden = false;

    const level = await getNotificationPermissionLevel();
    if (level === 'denied') {
      chromeNote.hidden = false;
      fixSection.hidden = false;
    }

    const pinned = await isPinnedToToolbar();
    pinTip.hidden = pinned;
  });

  notSeenLink.addEventListener('click', () => {
    fixSection.hidden = false;
    notSeenLink.hidden = true;
  });
});
