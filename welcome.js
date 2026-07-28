/* Onboarding flow controller.

   The left rail holds one pane per step; the right stage plays a looping
   walkthrough scene chosen by the current step (see walkthrough.js). */

document.addEventListener('DOMContentLoaded', async () => {
  const wt = createWalkthrough(document.getElementById('walkthrough'));

  const panes = {};
  document.querySelectorAll('[data-pane]').forEach((el) => {
    panes[el.dataset.pane] = el;
  });

  const progress = document.querySelector('[data-progress]');
  const dots = Array.from(document.querySelectorAll('[data-dot]'));

  let platform = detectPlatform();
  let step = null;
  let pinNeeded = true;

  // Which dot lights up for each step; `fix` is a detour off the `test` step.
  const DOT_FOR_STEP = { intro: 'intro', test: 'test', fix: 'test', pin: 'pin', done: 'done' };
  const DOT_ORDER = ['intro', 'test', 'pin', 'done'];

  function sceneFor(name) {
    if (name === 'fix') return platform === 'win' ? 'win' : 'mac';
    if (name === 'pin') return 'pin';
    return platform === 'win' ? 'banner-win' : 'banner';
  }

  function go(name) {
    if (name === 'pin' && !pinNeeded) name = 'done';
    if (step === name) return;
    step = name;

    Object.keys(panes).forEach((key) => {
      panes[key].classList.toggle('is-active', key === name);
    });

    const activeDot = DOT_FOR_STEP[name];
    const activeIndex = DOT_ORDER.indexOf(activeDot);
    dots.forEach((dot) => {
      const i = DOT_ORDER.indexOf(dot.dataset.dot);
      dot.classList.toggle('is-current', i === activeIndex);
      dot.classList.toggle('is-done', i < activeIndex);
      dot.hidden = dot.dataset.dot === 'pin' && !pinNeeded;
    });
    progress.hidden = false;

    wt.play(sceneFor(name));
  }

  /* ---- Platform tabs (fix step) ---- */

  function setPlatform(next) {
    platform = next;
    document.querySelectorAll('[data-platform]').forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.platform === next);
      tab.setAttribute('aria-selected', String(tab.dataset.platform === next));
    });
    document.querySelectorAll('[data-steps]').forEach((list) => {
      list.hidden = list.dataset.steps !== next;
    });
    if (step === 'fix') wt.play(sceneFor('fix'));
  }

  document.querySelectorAll('[data-platform]').forEach((tab) => {
    tab.addEventListener('click', () => setPlatform(tab.dataset.platform));
  });
  setPlatform(platform);

  /* ---- Step navigation ---- */

  document.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => go(btn.dataset.go));
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => go(dot.dataset.dot));
  });

  document.querySelector('[data-skip]').addEventListener('click', () => go('done'));

  document.querySelector('[data-open-journal]').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('journal.html') });
  });

  /* ---- Chrome-level block helpers ---- */

  const chromeNote = document.querySelector('[data-chrome-note]');

  document.querySelector('[data-scene="blocked"]').addEventListener('click', (e) => {
    const btn = e.currentTarget; // currentTarget is nulled once dispatch ends
    if (wt.isPlaying('blocked')) wt.replay(); else wt.play('blocked');
    btn.textContent = 'Playing ↗';
    setTimeout(() => { btn.textContent = 'Show me how'; }, 2500);
  });

  document.querySelector('[data-copy]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = 'Copied ✓';
    } catch (err) {
      btn.textContent = 'Select it above';
    }
    setTimeout(() => { btn.textContent = 'Copy address'; }, 2000);
  });

  /* ---- Test notification ---- */

  const answer = document.querySelector('[data-answer]');

  async function runTest(btn) {
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    await sendTestNotification();

    btn.disabled = false;
    btn.textContent = label;

    // Chrome-level blocking is the one failure we can actually detect.
    const level = await getNotificationPermissionLevel();
    if (level === 'denied') {
      chromeNote.hidden = false;
      go('fix');
      wt.play('blocked');
      return;
    }

    if (step === 'test') answer.hidden = false;
  }

  document.querySelectorAll('[data-test-btn]').forEach((btn) => {
    btn.addEventListener('click', () => runTest(btn));
  });

  document.querySelector('[data-saw="yes"]').addEventListener('click', () => go('pin'));
  document.querySelector('[data-saw="no"]').addEventListener('click', () => go('fix'));

  /* ---- Boot ---- */

  pinNeeded = !(await isPinnedToToolbar());

  const params = new URLSearchParams(location.search);
  go(params.get('context') === 'fix' ? 'fix' : 'intro');
});
