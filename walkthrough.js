/* ==========================================================================
   Walkthrough — a tiny scripted-UI animation engine.

   Instead of shipping a screen recording, each scene is a hand-built mock of
   the real OS/browser UI plus a timeline of cursor moves, clicks and state
   changes. Cursor targets are CSS selectors resolved from the live DOM at
   playback time, so nothing depends on hard-coded pixel positions.

   Usage:
     const wt = createWalkthrough(document.getElementById('stage'));
     wt.play('mac');   // 'banner' | 'mac' | 'win' | 'pin' | 'blocked'
     wt.stop();
   ========================================================================== */

(function (global) {
  'use strict';

  const CANVAS_W = 640;
  const CANVAS_H = 400;

  /* ---- Small SVG helpers ------------------------------------------------- */

  const ICON = {
    wifi: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2.5 8.5a16 16 0 0 1 19 0"/><path d="M6 12.6a11 11 0 0 1 12 0"/><path d="M9.4 16.6a6 6 0 0 1 5.2 0"/><circle cx="12" cy="20" r="0.6" fill="currentColor"/></svg>',
    bluetooth: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7.5 17 16.5 12 21V3l5 4.5L7 16.5"/></svg>',
    network: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18"/></svg>',
    bell: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5a6 6 0 0 0-6 6v4l-1.6 3.1a.8.8 0 0 0 .7 1.2h13.8a.8.8 0 0 0 .7-1.2L18 12.5v-4a6 6 0 0 0-6-6Zm0 19a2.7 2.7 0 0 0 2.6-2H9.4a2.7 2.7 0 0 0 2.6 2Z"/></svg>',
    sound: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4 7 8.5H4v7h3L12 20V4Z"/><path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    moon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>',
    clock: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    display: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="13" rx="1.6"/><path d="M9 21h6"/></svg>',
    chevron: '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    back: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    search: '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
    puzzle: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M10 3.5a1.9 1.9 0 0 1 3.8 0V5h3a1 1 0 0 1 1 1v3h1.6a1.9 1.9 0 0 1 0 3.8H17.8v3a1 1 0 0 1-1 1h-3v1.5a1.9 1.9 0 0 1-3.8 0V16.8h-3a1 1 0 0 1-1-1v-3H4.5a1.9 1.9 0 0 1 0-3.8H6V6a1 1 0 0 1 1-1h3V3.5Z"/></svg>',
    pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2.5 21.5 9.5l-3 1-4 4-.6 4.2-6.6-6.6L11.5 11l4-4 -1-4.5Z"/><path d="M7.3 16.7 3 21"/></svg>',
    dots: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>',
    lock: '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5A4.5 4.5 0 0 0 7.5 7v2.5H6.8A1.8 1.8 0 0 0 5 11.3v8A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.8-1.7v-8a1.8 1.8 0 0 0-1.8-1.8h-.7V7A4.5 4.5 0 0 0 12 2.5Zm2.5 7h-5V7a2.5 2.5 0 0 1 5 0Z"/></svg>',
    replay: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 5 21 10 16 10"/><path d="M19.4 14a8 8 0 1 1-1.9-8.3L21 10"/></svg>',
    arrowCurve: '<svg width="54" height="46" viewBox="0 0 54 46" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 42C4 20 18 6 44 5" stroke-dasharray="4 5"/><path d="M36 2.5 45 5.2 39.5 12" stroke-linejoin="round"/></svg>'
  };

  const CURSOR_SVG =
    '<svg class="wt-cursor-arrow" width="20" height="24" viewBox="0 0 20 24" fill="none">' +
    '<path d="M3 2.2 3 20.6 8.2 15.8 11.3 22.6 14.3 21.1 11.2 14.5 17.2 14.5Z" fill="#17161a" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>' +
    '</svg>';

  function chromeLogo(cls) {
    return (
      '<svg class="' + cls + '" viewBox="0 0 48 48">' +
      '<path d="M4.95 13 A22 22 0 0 1 43.05 13 L24 24 Z" fill="#ea4335"/>' +
      '<path d="M24 46 A22 22 0 0 1 4.95 13 L24 24 Z" fill="#34a853"/>' +
      '<path d="M43.05 13 A22 22 0 0 1 24 46 L24 24 Z" fill="#fbbc04"/>' +
      '<circle cx="24" cy="24" r="9.6" fill="#fff"/>' +
      '<circle cx="24" cy="24" r="7.4" fill="#1a73e8"/>' +
      '</svg>'
    );
  }

  function sq(color, glyph) {
    return '<span class="wt-sq" style="background:' + color + '">' + glyph + '</span>';
  }

  function flatIcon(color, letter) {
    return (
      '<span class="wt-appicon" style="background:' + color +
      ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:600">' +
      letter + '</span>'
    );
  }

  /* ---- Scene: notification banner ---------------------------------------- */

  function bannerScene(platform) {
    const isWin = platform === 'win';
    const shell = isWin
      ? '<div class="wt-screen wt-screen--win">' +
        '<div class="wt-taskbar"><i></i><i></i><i></i><span class="wt-taskbar-clock">9:41 AM<br>Mon 12 May</span></div>'
      : '<div class="wt-screen wt-screen--mac">' +
        '<div class="wt-menubar"><b>Chrome</b><span>File</span><span>Edit</span><span>View</span>' +
        '<span class="wt-menubar-spacer"></span><span>Mon 9:41 AM</span></div>';

    // A dimmed window behind the banner so the reminder reads as arriving
    // *over* whatever you were doing, rather than floating on an empty desktop.
    const backdrop =
      '<div class="wt-ghostwin">' +
      '<div class="wt-ghostbar"><span class="wt-lights"><i></i><i></i><i></i></span></div>' +
      '<div class="wt-ghostbody"><i style="width:62%"></i><i style="width:88%"></i>' +
      '<i style="width:74%"></i><i style="width:40%"></i><i style="width:80%"></i>' +
      '<i style="width:55%"></i></div></div>';

    return {
      total: 6400,
      noCursor: true,
      beats: 2,
      html:
        shell + backdrop +
        '<div class="wt-banner wt-banner--' + (isWin ? 'win' : 'mac') + '" data-banner>' +
        '<img src="icons/icon48.png" alt="">' +
        '<div><div class="wt-banner-title">A little reminder for you</div>' +
        '<div class="wt-banner-body">You are allowed to slow down.</div></div>' +
        '<span class="wt-banner-when">now</span>' +
        '</div>' +
        '<span class="wt-hint-arrow" data-hint style="' +
        (isWin ? 'right:290px;bottom:56px;transform:scaleX(-1)' : 'right:292px;top:52px') +
        '">' + ICON.arrowCurve + '</span>' +
        '</div>',
      timeline: [
        { at: 0, caption: 'This is what a reminder looks like.', beat: 0 },
        { at: 700, add: [['[data-banner]', 'is-in']] },
        { at: 1500, add: [['[data-hint]', 'is-in']] },
        {
          at: 3400,
          beat: 1,
          caption: isWin
            ? 'It appears in the bottom-right corner, then slips away.'
            : 'It appears in the top-right corner, then slips away.'
        },
        { at: 4600, remove: [['[data-hint]', 'is-in']] },
        { at: 4900, add: [['[data-banner]', 'is-out']] }
      ]
    };
  }

  /* ---- Scene: macOS System Settings -------------------------------------- */

  function macNav(id, glyph, color, label) {
    return (
      '<div class="wt-nav-item" data-nav="' + id + '">' +
      sq(color, glyph) + '<span>' + label + '</span></div>'
    );
  }

  function macAppRow(id, icon, name, value) {
    return (
      '<div class="wt-row" data-app="' + id + '">' + icon +
      '<span class="wt-row-name">' + name + '</span>' +
      '<span class="wt-row-value" data-value>' + value + '</span>' +
      '<span class="wt-chev">' + ICON.chevron + '</span></div>'
    );
  }

  function macScene() {
    return {
      total: 12200,
      beats: 4,
      html:
        '<div class="wt-screen wt-screen--mac">' +
        '<div class="wt-menubar"><b>System Settings</b><span>File</span><span>Edit</span><span>Window</span>' +
        '<span class="wt-menubar-spacer"></span><span>Mon 9:41 AM</span></div>' +

        '<div class="wt-macwin">' +
        '<div class="wt-macside">' +
        '<div class="wt-lights"><i></i><i></i><i></i></div>' +
        '<div class="wt-search">' + ICON.search + '<span>Search</span></div>' +
        '<div class="wt-nav">' +
        macNav('wifi', ICON.wifi, '#2d7ff9', 'Wi-Fi') +
        macNav('bt', ICON.bluetooth, '#2d7ff9', 'Bluetooth') +
        macNav('net', ICON.network, '#2d7ff9', 'Network') +
        macNav('notif', ICON.bell, '#e0453e', 'Notifications') +
        macNav('sound', ICON.sound, '#e0453e', 'Sound') +
        macNav('focus', ICON.moon, '#5b52d6', 'Focus') +
        macNav('screen', ICON.clock, '#5b52d6', 'Screen Time') +
        macNav('display', ICON.display, '#3d7fd1', 'Displays') +
        '</div></div>' +

        '<div class="wt-macmain">' +
        '<div class="wt-macbar">' +
        '<span class="wt-back" data-back hidden>' + ICON.back + '</span>' +
        '<span data-title>Notifications</span></div>' +

        '<div class="wt-pane is-active" data-pane="list">' +
        '<div class="wt-pane-label">Application Notifications</div>' +
        '<div class="wt-list">' +
        macAppRow('cal', flatIcon('#ffffff', '<span style="color:#e0453e">12</span>'), 'Calendar', 'Banners') +
        macAppRow('mail', flatIcon('#2d7ff9', '✉'), 'Mail', 'Alerts') +
        '<div class="wt-row" data-app="chrome">' + chromeLogo('wt-appicon') +
        '<span class="wt-row-name"><b>Google Chrome</b></span>' +
        '<span class="wt-row-value" data-value>Off</span>' +
        '<span class="wt-chev">' + ICON.chevron + '</span></div>' +
        macAppRow('msg', flatIcon('#34c759', '◍'), 'Messages', 'Banners') +
        macAppRow('rem', flatIcon('#ff9f0a', '☰'), 'Reminders', 'Banners') +
        '</div></div>' +

        '<div class="wt-pane" data-pane="detail">' +
        '<div class="wt-detail-head">' + chromeLogo('wt-appicon') +
        '<div><div class="wt-detail-title">Google Chrome</div>' +
        '<div class="wt-detail-sub">Version 126.0</div></div></div>' +
        '<div class="wt-list"><div class="wt-row" data-allow>' +
        '<span class="wt-row-name">Allow notifications</span>' +
        '<span class="wt-switch" data-switch></span></div></div>' +
        '<div class="wt-dim" data-alertstyle>' +
        '<div class="wt-pane-label" style="margin-top:11px">Alert style</div>' +
        '<div class="wt-seg"><span>None</span><span class="is-picked">Banners</span><span>Alerts</span></div>' +
        '</div></div>' +

        '</div></div></div>',

      timeline: [
        { at: 0, caption: 'Open  Apple menu → System Settings.', beat: 0, cursor: [500, 340] },
        { at: 500, caption: 'Click Notifications in the sidebar.', move: '[data-nav="notif"]', dur: 950 },
        { at: 1450, add: [['[data-nav="notif"]', 'is-hot']] },
        { at: 1900, click: true },
        { at: 2050, add: [['[data-nav="notif"]', 'is-selected']], remove: [['[data-nav="notif"]', 'is-hot']] },

        { at: 2900, caption: 'Find Google Chrome in the app list.', beat: 1, move: '[data-app="chrome"]', dur: 900 },
        { at: 3800, add: [['[data-app="chrome"]', 'is-hot']] },
        { at: 4300, click: true },
        {
          at: 4500,
          remove: [['[data-pane="list"]', 'is-active'], ['[data-app="chrome"]', 'is-hot']],
          add: [['[data-pane="detail"]', 'is-active']],
          text: [['[data-title]', 'Google Chrome']],
          show: [['[data-back]', true]]
        },

        { at: 5500, caption: 'Switch “Allow notifications” on.', beat: 2, move: ['[data-switch]', 0, 0], dur: 900 },
        { at: 6600, click: true },
        { at: 6750, add: [['[data-switch]', 'is-on'], ['[data-alertstyle]', 'is-live']] },

        { at: 7800, caption: 'That’s it — Chrome can reach you again.', beat: 3, move: '[data-back]', dur: 900 },
        { at: 8900, click: true },
        {
          at: 9050,
          remove: [['[data-pane="detail"]', 'is-active']],
          add: [['[data-pane="list"]', 'is-active'], ['[data-app="chrome"] [data-value]', 'is-on']],
          text: [['[data-title]', 'Notifications'], ['[data-app="chrome"] [data-value]', 'Banners']],
          show: [['[data-back]', false]]
        },
        { at: 9900, to: [520, 340], dur: 950 }
      ]
    };
  }

  /* ---- Scene: Windows Settings ------------------------------------------- */

  function winNav(id, label, glyph, color) {
    return (
      '<div class="wt-nav-item" data-nav="' + id + '">' + sq(color, glyph) + '<span>' + label + '</span></div>'
    );
  }

  function winScene() {
    return {
      total: 12600,
      beats: 4,
      html:
        '<div class="wt-screen wt-screen--win">' +
        '<div class="wt-winwin">' +
        '<div class="wt-winside">' +
        '<div class="wt-search">' + ICON.search + '<span>Find a setting</span></div>' +
        '<div class="wt-nav">' +
        winNav('system', 'System', ICON.display, '#0067c0') +
        winNav('bt', 'Bluetooth &amp; devices', ICON.bluetooth, '#0067c0') +
        winNav('net', 'Network &amp; internet', ICON.network, '#0067c0') +
        winNav('person', 'Personalization', ICON.moon, '#8764b8') +
        winNav('apps', 'Apps', ICON.puzzle, '#0067c0') +
        winNav('time', 'Time &amp; language', ICON.clock, '#0067c0') +
        '</div></div>' +

        '<div class="wt-winmain">' +
        '<div class="wt-crumb" data-crumb>System</div>' +
        '<div class="wt-h" data-title>System</div>' +

        '<div class="wt-pane is-active" data-pane="list">' +
        '<div class="wt-card" data-card="notif">' + sq('#0067c0', ICON.bell) +
        '<span class="wt-card-title">Notifications' +
        '<span class="wt-card-sub">Alerts from apps and system</span></span>' +
        '<span class="wt-row-value">On</span>' +
        '<span class="wt-chev">' + ICON.chevron + '</span></div>' +
        '<div class="wt-card">' + sq('#0067c0', ICON.sound) +
        '<span class="wt-card-title">Sound<span class="wt-card-sub">Volume levels, output</span></span>' +
        '<span class="wt-chev">' + ICON.chevron + '</span></div>' +
        '<div class="wt-card">' + sq('#0067c0', ICON.moon) +
        '<span class="wt-card-title">Focus<span class="wt-card-sub">Reduce distractions</span></span>' +
        '<span class="wt-chev">' + ICON.chevron + '</span></div>' +
        '</div>' +

        '<div class="wt-pane" data-pane="detail">' +
        '<div class="wt-card" data-card="master">' + sq('#0067c0', ICON.bell) +
        '<span class="wt-card-title">Notifications' +
        '<span class="wt-card-sub">Get notifications from apps and other senders</span></span>' +
        '<span class="wt-switch wt-switch--win is-on"></span></div>' +
        '<div class="wt-group-label" style="margin:14px 0 6px">Notifications from apps and other senders</div>' +
        '<div class="wt-card" data-card="chrome">' + chromeLogo('wt-appicon') +
        '<span class="wt-card-title">Google Chrome' +
        '<span class="wt-card-sub" data-sub>Off</span></span>' +
        '<span class="wt-switch wt-switch--win" data-switch></span></div>' +
        '</div>' +

        '</div></div></div>',

      timeline: [
        { at: 0, caption: 'Open  Start → Settings.', beat: 0, cursor: [500, 350] },
        { at: 500, caption: 'Choose System in the sidebar.', move: '[data-nav="system"]', dur: 900 },
        { at: 1400, add: [['[data-nav="system"]', 'is-hot']] },
        { at: 1800, click: true },
        { at: 1950, add: [['[data-nav="system"]', 'is-selected']], remove: [['[data-nav="system"]', 'is-hot']] },

        { at: 2700, caption: 'Open Notifications.', beat: 1, move: '[data-card="notif"]', dur: 850 },
        { at: 3550, add: [['[data-card="notif"]', 'is-hot']] },
        { at: 4000, click: true },
        {
          at: 4200,
          remove: [['[data-pane="list"]', 'is-active'], ['[data-card="notif"]', 'is-hot']],
          add: [['[data-pane="detail"]', 'is-active']],
          text: [['[data-crumb]', 'System  ›  Notifications'], ['[data-title]', 'Notifications']]
        },

        { at: 5200, caption: 'Scroll to Google Chrome and switch it on.', beat: 2, move: '[data-card="chrome"] [data-switch]', dur: 950 },
        { at: 6250, add: [['[data-card="chrome"]', 'is-hot']] },
        { at: 6600, click: true },
        {
          at: 6750,
          add: [['[data-switch]', 'is-on']],
          text: [['[data-sub]', 'On — banners, sounds']],
          remove: [['[data-card="chrome"]', 'is-hot']]
        },

        { at: 7900, caption: 'Done — Chrome can reach you again.', beat: 3, to: [500, 340], dur: 900 }
      ]
    };
  }

  /* ---- Scene: pin the extension to the Chrome toolbar --------------------- */

  function browserChrome(inner, extras, pinned) {
    return (
      '<div class="wt-screen wt-screen--browser">' +
      '<div class="wt-browser">' +
      '<div class="wt-tabstrip"><div class="wt-lights"><i></i><i></i><i></i></div>' +
      '<div class="wt-tab">' + chromeLogo('wt-appicon') + '<span>New Tab</span></div></div>' +
      '<div class="wt-toolbar">' +
      '<span class="wt-tbicon">' + ICON.back + '</span>' +
      '<span class="wt-omnibox">' + ICON.lock + '<span data-url>chrome://newtab</span></span>' +
      '<span class="wt-pinned-slot' + (pinned ? ' is-shown' : '') + '" data-slot>' +
      '<img src="icons/icon48.png" alt=""></span>' +
      '<span class="wt-tbicon" data-puzzle>' + ICON.puzzle + '</span>' +
      '<span class="wt-tbicon">' + ICON.dots + '</span>' +
      '</div>' +
      inner +
      '</div>' +
      (extras || '') +
      '</div>'
    );
  }

  function pinScene() {
    const popover =
      '<div class="wt-popover" data-popover>' +
      '<div class="wt-popover-title">Extensions</div>' +
      '<div class="wt-ext-row" data-ext="gratitude">' +
      '<img src="icons/icon48.png" alt="">' +
      '<span class="wt-ext-name">Daily Gratitude</span>' +
      '<span class="wt-pin" data-pin>' + ICON.pin + '</span></div>' +
      '<div class="wt-ext-row"><span class="wt-appicon" style="background:#8ab4f8"></span>' +
      '<span class="wt-ext-name">Reading List</span>' +
      '<span class="wt-pin">' + ICON.pin + '</span></div>' +
      '</div>';

    return {
      total: 11200,
      beats: 3,
      html: browserChrome(
        '<div class="wt-newtab">' +
        '<div class="wt-newtab-logo">' + chromeLogo('') + '</div>' +
        '<div class="wt-newtab-search">' + ICON.search + '<span>Search Google or type a URL</span></div>' +
        '<div class="wt-newtab-tiles"><i></i><i></i><i></i><i></i><i></i></div>' +
        '</div>' + popover
      ),
      timeline: [
        { at: 0, caption: 'Click the puzzle-piece icon in the Chrome toolbar.', beat: 0, cursor: [300, 340] },
        { at: 500, move: '[data-puzzle]', dur: 950 },
        { at: 1450, add: [['[data-puzzle]', 'is-hot']] },
        { at: 1900, click: true },
        { at: 2050, add: [['[data-popover]', 'is-open']] },

        { at: 3000, caption: 'Find Daily Gratitude, then click its pin.', beat: 1, move: '[data-pin]', dur: 900 },
        { at: 3900, add: [['[data-ext="gratitude"]', 'is-hot']] },
        { at: 4400, click: true },
        { at: 4550, add: [['[data-pin]', 'is-pinned'], ['[data-slot]', 'is-shown'], ['[data-slot]', 'is-pop']] },

        { at: 5800, caption: 'Now it lives in your toolbar — one click away.', beat: 2, move: '[data-slot]', dur: 850 },
        { at: 6900, remove: [['[data-popover]', 'is-open'], ['[data-ext="gratitude"]', 'is-hot'], ['[data-puzzle]', 'is-hot']] },
        { at: 8200, to: [320, 340], dur: 900 }
      ]
    };
  }

  /* ---- Scene: un-block notifications in Chrome settings ------------------- */

  function blockedScene() {
    const page =
      '<div class="wt-page">' +
      '<div class="wt-page-title">Notifications</div>' +
      '<div class="wt-group-label">Allowed to send notifications</div>' +
      '<div class="wt-srow wt-srow-empty" data-empty>No sites added</div>' +
      '<div class="wt-srow is-gone" data-moved hidden>' +
      '<img src="icons/icon48.png" alt="" class="wt-appicon">' +
      '<span class="wt-row-name">Daily Gratitude</span>' +
      '<span class="wt-row-value is-on">Allowed</span></div>' +
      '<div class="wt-group-label">Not allowed to send notifications</div>' +
      '<div class="wt-srow" data-blocked>' +
      '<img src="icons/icon48.png" alt="" class="wt-appicon">' +
      '<span class="wt-row-name">Daily Gratitude</span>' +
      '<span class="wt-tbicon" data-kebab style="color:#5f6368">' + ICON.dots + '</span></div>' +
      '</div>' +
      '<div class="wt-menu" data-menu style="right:26px;top:250px">' +
      '<div data-allow>Allow</div><div>Edit</div><div>Remove</div></div>';

    return {
      total: 10600,
      beats: 3,
      html: browserChrome(page),
      timeline: [
        {
          at: 0,
          beat: 0,
          caption: 'Paste chrome://settings/content/notifications into the address bar.',
          cursor: [320, 350],
          text: [['[data-url]', 'chrome://settings/content/notifications']]
        },
        { at: 900, caption: 'Under “Not allowed”, open the menu next to Daily Gratitude.', beat: 1, move: '[data-kebab]', dur: 950 },
        { at: 1950, add: [['[data-blocked]', 'is-hot']] },
        { at: 2400, click: true },
        { at: 2550, add: [['[data-menu]', 'is-open']] },

        { at: 3400, caption: 'Choose Allow.', beat: 2, move: '[data-allow]', dur: 800 },
        { at: 4300, add: [['[data-allow]', 'is-hot']] },
        { at: 4750, click: true },
        { at: 4900, remove: [['[data-menu]', 'is-open'], ['[data-allow]', 'is-hot']], add: [['[data-blocked]', 'is-gone'], ['[data-empty]', 'is-gone']] },
        { at: 5250, hide: ['[data-blocked]', '[data-empty]'], reveal: ['[data-moved]'] },
        // One frame later, so the row actually transitions in rather than
        // popping straight to its final state.
        { at: 5330, remove: [['[data-moved]', 'is-gone']] },
        { at: 5600, caption: 'It moves up to “Allowed” — reminders can get through now.' },
        { at: 6600, to: [320, 350], dur: 900 }
      ]
    };
  }


  /* ---- Scene: open the journal from the toolbar ---------------------------- */

  function journalScene() {
    const dots = [1, 1, 0, 0, 0, 0, 0]
      .map((on, i) => `<i class="${on ? 'is-on' : ''}${i === 2 ? ' is-today' : ''}"></i>`).join('');
    const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      .map((l, i) => `<span${i === 2 ? ' class="is-today"' : ''}>${l}</span>`).join('');

    // A miniature of the real popup, hanging off the pinned toolbar icon.
    const popup =
      '<div class="wt-pop" data-pop>' +
      '<div class="wt-pop-head"><span class="wt-pop-brand">' +
      '<img src="icons/icon48.png" alt="">Daily Gratitude</span>' +
      '<span class="wt-pop-set">⌄ settings</span></div>' +
      '<div class="wt-pop-date">Wednesday, 29 July</div>' +
      '<div class="wt-pop-theme">Growth</div>' +
      '<div class="wt-pop-week">' + dots + '</div>' +
      '<div class="wt-pop-letters">' + letters + '</div>' +
      '<div class="wt-pop-cta" data-cta><span>Write today’s daily<br>gratitude journal' +
      '<em>Three questions · five minutes</em></span><b>→</b></div>' +
      '</div>';

    // The journal page, revealed in the tab once the CTA is pressed. This is a
    // 300/640 scale model of the real page — same card, same rule, same date
    // heading, same numbered questions over two ruled lines — running off the
    // bottom of the viewport exactly as the real 880px page does.
    const jq = (n, q) =>
      '<div class="wt-jgroup"><div class="wt-jq"><i>' + n + '</i><span>' + q +
      '</span></div><div class="wt-janswer"></div></div>';

    const cover =
      '<div class="wt-jcover" data-jcover><div class="wt-jcover-inner">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f3ded2" ' +
      'stroke-width="1.3" stroke-linecap="round"><circle cx="12" cy="13.5" r="4"/>' +
      '<line x1="12" y1="3.2" x2="12" y2="6"/><line x1="3.8" y1="13.5" x2="1.5" y2="13.5"/>' +
      '<line x1="22.5" y1="13.5" x2="20.2" y2="13.5"/><line x1="5.6" y1="7.1" x2="4" y2="5.5"/>' +
      '<line x1="18.4" y1="7.1" x2="20" y2="5.5"/></svg>' +
      '<div class="wt-jcover-title">Daily Gratitude</div>' +
      '<div class="wt-jcover-sub">Morning Journal</div>' +
      '<div class="wt-jcover-hint">Click to open</div>' +
      '</div></div>';

    const page =
      '<div class="wt-jpage" data-jpage><div class="wt-jstack">' +
      '<div class="wt-jcard">' +
      '<div class="wt-jhead"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#bf5a2e" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="13.5" r="4"/><line x1="12" y1="3.2" x2="12" y2="6"/><line x1="3.8" y1="13.5" x2="1.5" y2="13.5"/><line x1="22.5" y1="13.5" x2="20.2" y2="13.5"/><line x1="5.6" y1="7.1" x2="4" y2="5.5"/><line x1="18.4" y1="7.1" x2="20" y2="5.5"/></svg> <span>Daily Gratitude</span></div>' +
      '<div class="wt-jhr"></div>' +
      '<div class="wt-jdate">Wednesday, July 29</div>' +
      '<div class="wt-jlabel">I am grateful for…<b>Growth</b></div>' +
      '<div class="wt-jlines">' +
      jq(1, 'What advice would you give someone starting what you’ve already been through?') +
      jq(2, 'What’s something hard you did that you’re now glad you had to do?') +
      jq(3, 'What can you do now that you couldn’t a year ago?') +
      '</div></div>' + cover + '</div></div>';

    return {
      total: 12800,
      beats: 4,
      html: browserChrome(
        '<div class="wt-newtab" data-newtab>' +
        '<div class="wt-newtab-logo">' + chromeLogo('') + '</div>' +
        '<div class="wt-newtab-search">' + ICON.search + '<span>Search Google or type a URL</span></div>' +
        '<div class="wt-newtab-tiles"><i></i><i></i><i></i><i></i><i></i></div>' +
        '</div>' + page + popup,
        '',
        true // start with the extension already pinned
      ),
      timeline: [
        { at: 0, caption: 'Click Daily Gratitude in your toolbar.', beat: 0, cursor: [300, 340] },
        { at: 500, move: '[data-slot]', dur: 950 },
        { at: 1500, add: [['[data-slot]', 'is-hot']] },
        { at: 1950, click: true },
        { at: 2100, add: [['[data-pop]', 'is-open']] },

        { at: 3100, caption: 'Press the button — that is today’s page.', beat: 1, move: '[data-cta]', dur: 900 },
        { at: 4100, add: [['[data-cta]', 'is-hot']] },
        { at: 4600, click: true },
        {
          at: 4800,
          remove: [['[data-pop]', 'is-open'], ['[data-cta]', 'is-hot'], ['[data-slot]', 'is-hot']],
          add: [['[data-newtab]', 'is-gone'], ['[data-jpage]', 'is-open']],
          text: [['[data-url]', 'Daily Gratitude — Today’s Page']]
        },

        // The page does not appear bare: the journal opens on its cover, and
        // the reader clicks it open. Same as the real runBookIntro.
        { at: 5300, caption: 'Your journal opens on its cover — click it.', beat: 2,
          move: '[data-jcover]', dur: 900 },
        { at: 6400, click: true },
        { at: 6600, add: [['[data-jcover]', 'is-open']] },

        { at: 7900, caption: 'Three questions, five minutes. That is the whole thing.', beat: 3 },
        { at: 8500, to: [320, 340], dur: 900 }
      ]
    };
  }

  /* ---- Scene registry ----------------------------------------------------- */

  const SCENES = {
    banner: () => bannerScene('mac'),
    'banner-win': () => bannerScene('win'),
    mac: macScene,
    win: winScene,
    pin: pinScene,
    journal: journalScene,
    blocked: blockedScene
  };

  /* ---- Engine ------------------------------------------------------------- */

  function createWalkthrough(host) {
    const reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    host.classList.add('wt');
    // The mock UI and its caption restate the numbered steps already in the
    // rail, so they stay out of the accessibility tree — only the replay
    // control is exposed.
    host.innerHTML =
      '<div class="wt-viewport" aria-hidden="true"><div class="wt-canvas">' +
      '<div class="wt-scene"></div>' +
      '<div class="wt-cursor"><span class="wt-cursor-ring"></span>' + CURSOR_SVG + '</div>' +
      '</div></div>' +
      '<div class="wt-caption"><span class="wt-beats" aria-hidden="true"></span>' +
      '<span class="wt-caption-text" aria-hidden="true"></span>' +
      '<button class="wt-replay" type="button" title="Replay" aria-label="Replay walkthrough">' + ICON.replay + '</button>' +
      '</div>';

    const viewport = host.querySelector('.wt-viewport');
    const canvas = host.querySelector('.wt-canvas');
    const sceneEl = host.querySelector('.wt-scene');
    const cursor = host.querySelector('.wt-cursor');
    const beatsEl = host.querySelector('.wt-beats');
    const captionEl = host.querySelector('.wt-caption-text');
    const replayBtn = host.querySelector('.wt-replay');

    let timers = [];
    let scale = 1;
    let currentId = null;
    let currentScene = null;

    function fit() {
      scale = viewport.clientWidth / CANVAS_W;
      canvas.style.transform = 'scale(' + scale + ')';
      viewport.style.height = Math.round(CANVAS_H * scale) + 'px';
    }

    fit();
    if (global.ResizeObserver) {
      new ResizeObserver(fit).observe(viewport);
    } else {
      global.addEventListener('resize', fit);
    }

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function at(ms, fn) {
      timers.push(setTimeout(fn, ms));
    }

    function each(sel, fn) {
      Array.prototype.forEach.call(sceneEl.querySelectorAll(sel), fn);
    }

    /* Resolve a cursor target to canvas-space coordinates. */
    function pointOf(target) {
      let sel = target;
      let dx = 0;
      let dy = 0;
      if (Array.isArray(target)) {
        sel = target[0];
        dx = target[1] || 0;
        dy = target[2] || 0;
      }
      if (!sel) return null;
      const el = sceneEl.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return [
        (r.left - c.left) / scale + r.width / 2 / scale + dx,
        (r.top - c.top) / scale + r.height / 2 / scale + dy
      ];
    }

    function placeCursor(pt, dur) {
      if (!pt) return;
      cursor.style.setProperty('--dur', (reduced ? 1 : dur || 700) + 'ms');
      cursor.style.setProperty('--x', pt[0] + 'px');
      cursor.style.setProperty('--y', pt[1] + 'px');
    }

    function clickPulse() {
      cursor.classList.remove('is-down');
      void cursor.offsetWidth;
      cursor.classList.add('is-down');
      at(220, () => cursor.classList.remove('is-down'));
    }

    function setBeats(count, active) {
      if (beatsEl.childElementCount !== count) {
        beatsEl.innerHTML = new Array(count).fill('<span class="wt-beat"></span>').join('');
      }
      Array.prototype.forEach.call(beatsEl.children, (el, i) => {
        el.classList.toggle('is-on', i <= active);
      });
    }

    function applyStep(step, scene) {
      if (step.caption != null) captionEl.textContent = step.caption;
      if (step.beat != null) setBeats(scene.beats || 1, step.beat);
      if (step.cursor) placeCursor(step.cursor, 1);
      if (step.move) placeCursor(pointOf(step.move), step.dur);
      if (step.to) placeCursor(step.to, step.dur);
      if (step.click) clickPulse();
      if (step.add) step.add.forEach(([sel, cls]) => each(sel, (el) => el.classList.add(cls)));
      if (step.remove) step.remove.forEach(([sel, cls]) => each(sel, (el) => el.classList.remove(cls)));
      if (step.text) step.text.forEach(([sel, txt]) => each(sel, (el) => { el.textContent = txt; }));
      if (step.show) step.show.forEach(([sel, on]) => each(sel, (el) => { el.hidden = !on; }));
      if (step.hide) step.hide.forEach((sel) => each(sel, (el) => { el.style.display = 'none'; }));
      if (step.reveal) step.reveal.forEach((sel) => each(sel, (el) => {
        el.hidden = false;
        el.style.display = '';
      }));
    }

    function run(scene, loop) {
      clearTimers();
      sceneEl.classList.remove('is-fading');
      sceneEl.innerHTML = scene.html;
      cursor.hidden = !!scene.noCursor;
      setBeats(scene.beats || 1, -1);
      captionEl.textContent = '';

      // Park the cursor before the first move so it never streaks in from 0,0.
      const first = scene.timeline.find((s) => s.cursor);
      placeCursor(first ? first.cursor : [CANVAS_W / 2, CANVAS_H - 40], 1);

      scene.timeline.forEach((step) => at(step.at, () => applyStep(step, scene)));

      if (loop && !reduced) {
        at(Math.max(0, scene.total - 420), () => sceneEl.classList.add('is-fading'));
        at(scene.total, () => run(scene, true));
      }
    }

    return {
      /* Play a scene by id. Loops forever unless the user prefers reduced motion. */
      play(id) {
        const factory = SCENES[id];
        if (!factory) return;
        if (id === currentId) return; // already running this one
        currentId = id;
        currentScene = factory();
        run(currentScene, true);
      },
      replay() {
        if (currentScene) run(currentScene, true);
      },
      stop() {
        clearTimers();
        currentId = null;
      },
      isPlaying(id) {
        return currentId === id;
      }
    };
  }

  replayBinder();
  function replayBinder() {
    // Delegated so each walkthrough's replay button works without extra wiring.
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.wt-replay');
      if (!btn) return;
      const host = btn.closest('.wt');
      if (host && host._wt) host._wt.replay();
    });
  }

  global.createWalkthrough = function (host) {
    const wt = createWalkthrough(host);
    host._wt = wt;
    return wt;
  };
  global.WALKTHROUGH_SCENES = SCENES;
})(window);
