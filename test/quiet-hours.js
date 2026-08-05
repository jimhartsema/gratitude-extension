/* Guards the quiet-hours window in background.js.
 *
 *   node test/quiet-hours.js
 *
 * Reminders once fired around the clock — the alarm handler checked the
 * enabled toggle and whether a window was open, but never the hour, so anyone
 * leaving Chrome running overnight woke to a stack of notifications sent while
 * they slept. That shipped unnoticed for months because nothing exercised the
 * handler at 3am.
 *
 * So this loads the real background.js in a stubbed service-worker context and
 * fires the reminder alarm once for every hour of the day. No dependencies and
 * no runner — plain node, so it stays runnable without a build step.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..');

const DAY_START_HOUR = 8;  // must match background.js
const DAY_END_HOUR = 22;

// Runs the alarm handler as though it fired at half past the given hour, and
// returns whatever notifications it tried to send.
function runAtHour(hour, opts = {}) {
  const sent = [];
  let onAlarm = null;

  // background.js reads the clock through `new Date()`; pin it to one moment.
  const at = (h) => new Date(2026, 7, 5, h, 30, 0);
  const FixedDate = class extends Date {
    constructor(...args) {
      if (args.length === 0) super(2026, 7, 5, hour, 30, 0);
      else super(...args);
    }
    static now() { return at(hour).getTime(); }
  };

  const ctx = {
    console,
    Date: FixedDate,
    Math,
    // background.js pulls its shared helpers in this way.
    importScripts: (...files) => {
      files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx));
    },
    chrome: {
      alarms: {
        get: (name, cb) => cb({ name }),
        create: () => {},
        onAlarm: { addListener: (fn) => { onAlarm = fn; } }
      },
      storage: {
        sync: { get: async () => ({ enabled: opts.enabled !== false }) },
        local: { get: async () => ({ journal: {} }), set: async () => {} },
        onChanged: { addListener: () => {} }
      },
      windows: { getAll: async () => (opts.noWindows ? [] : [{ id: 1 }]) },
      notifications: {
        create: (options) => sent.push(options),
        onClicked: { addListener: () => {} }
      },
      action: { setBadgeBackgroundColor: () => {}, setBadgeText: () => {} },
      runtime: {
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} },
        getURL: (p) => p
      },
      tabs: { create: () => {} }
    }
  };

  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'background.js'), 'utf8'), ctx);

  return onAlarm({ name: 'gratitude-reminder' }).then(() => sent);
}

(async () => {
  let failures = 0;
  const fail = (msg) => { console.log(`  FAIL  ${msg}`); failures++; };

  const fired = [];
  for (let hour = 0; hour < 24; hour++) {
    const didFire = (await runAtHour(hour)).length > 0;
    const shouldFire = hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
    if (didFire) fired.push(hour);
    if (didFire !== shouldFire) {
      fail(`${String(hour).padStart(2, '0')}:30 — fired=${didFire}, expected=${shouldFire}`);
    }
  }

  const silent = [...Array(24).keys()].filter((h) => !fired.includes(h));
  console.log('Fires at hours: ', fired.join(', '));
  console.log('Silent at hours:', silent.join(', '));
  console.log(`Total per day:   ${fired.length}`);

  // The guards that already existed must still hold inside waking hours —
  // quiet hours are an extra condition, not a replacement.
  if ((await runAtHour(10, { enabled: false })).length) {
    fail('sent at 10:30 with notifications turned off');
  }
  if ((await runAtHour(10, { noWindows: true })).length) {
    fail('sent at 10:30 with no Chrome window open');
  }

  console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
