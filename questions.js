// Themed journal prompts — one theme per weekday, 12 questions each.
// Loaded by journal.html BEFORE journal.js.

const THEMES = {
  monday: 'People',
  tuesday: 'Body & senses',
  wednesday: 'Growth',
  thursday: 'Simple pleasures',
  friday: 'Wishes come true',
  saturday: 'Place & home',
  sunday: 'Looking back, looking forward'
};

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const QUESTIONS = {
  monday: [
    'Who made your world a little softer this week?',
    'Someone who made my life better without knowing it is…',
    'Who checked in on you recently — in a big or small way?',
    'If I could thank one person from today, it would be … for …',
    'Who do you feel completely yourself around?',
    'Who believed in you before you believed in yourself?',
    "What's something a friend did recently you're still glad about?",
    'Which stranger was unexpectedly kind to you lately?',
    'Whose laugh are you grateful exists?',
    'Who taught you something you still use — recently or long ago?',
    'Which relationship in your life grew this year?',
    'Who would you love to sit across from right now — and why them?'
  ],
  tuesday: [
    'What did your body carry you through today?',
    'An ability I used today that not everyone has is…',
    "What's a smell, sound, or taste that made today better?",
    "What's something warm — literally warm — you enjoyed today?",
    'What did your hands do today that you’re glad they can do?',
    'When did you feel most at ease in your body today?',
    'One way I truly rested recently was…',
    "What tasted so good today you'd happily have it again tomorrow?",
    "What's one thing your health lets you do that you rarely think about?",
    'What did you notice today that most people would have walked past?',
    "What's a food, drink, or meal ritual you're quietly attached to?",
    'When did you breathe easier today — and what allowed that?'
  ],
  wednesday: [
    "What can you do now that you couldn't a year ago?",
    "What's something hard you did that you're now glad you had to do?",
    'Something my younger self would be proud I do now is…',
    'What mistake taught you something you still use?',
    "What's a fear that has gotten smaller over time?",
    "What did you learn recently that you're glad to know?",
    "A habit I've built that quietly improves my life is…",
    'What strength did you discover in yourself during a hard time?',
    'What are you better at than you give yourself credit for?',
    "What's a challenge you're in right now that future-you will thank you for?",
    "What's something you once found terrifying that's now just Tuesday?",
    "What advice would you give someone starting what you've already been through?"
  ],
  thursday: [
    'A tiny luxury today contained was…',
    "What's something ordinary about today that is secretly extraordinary?",
    'What small thing would you genuinely miss if it were gone tomorrow?',
    'What made you smile without trying today?',
    "What's the best thing you saw outside today?",
    'What moment today would have made a nice photo?',
    'What little convenience made your day smoother?',
    'Something I did today purely because I enjoy it was…',
    'What song, show, or page lifted your mood recently?',
    "What's the coziest moment today held?",
    'What free thing brought you real joy this week?',
    "What's a small sound you love — one you heard today?"
  ],
  friday: [
    'Something in my life today that I once only dreamed of is…',
    'What do you have now that you would have envied a few years ago?',
    "What's something you stopped wishing for — because it came true?",
    'A "normal" part of my day that used to be a goal is…',
    "What's something about your life that would amaze the you of five years ago?",
    'What problem from your past got solved better than you expected?',
    "What's something you worked hard for that you now get to enjoy?",
    'What ending turned out to be a beginning?',
    'What do you no longer worry about — and when did that happen?',
    "What's something you get to do regularly that was once a rare treat?",
    "Who in your life today would past-you not believe you'd get to know?",
    "What's a door that opened for you that you almost didn't knock on?"
  ],
  saturday: [
    'What corner of your world felt good to be in today?',
    'One way my home takes care of me is…',
    "What's something in the room around you that you're glad exists?",
    'Which place in your daily life would you miss most?',
    "What's a place from your past you still carry with you?",
    'What made your neighborhood or city feel good this week?',
    'My favorite small ritual at home is…',
    'Where did you feel most peaceful this week?',
    'What view — out a window, on a walk — are you thankful for?',
    'What object in your home has the best story behind it?',
    "What's the first thing you appreciate when you walk in your door?",
    'What place are you looking forward to returning to?'
  ],
  sunday: [
    "What went right this week that you almost didn't notice?",
    "What's one thing that could have gone wrong this week — and didn't?",
    "A moment from this week I'd happily relive is…",
    "What's a family memory that still makes you warm?",
    "What's the kindest thing anyone has done for you?",
    "What's a small moment you didn't realize was precious until later?",
    "Next week, I'm looking forward to…",
    "What's a piece of advice you're grateful someone gave you?",
    'Looking at this week as a whole — what are you most thankful happened?',
    "What almost didn't happen this week — but thankfully did?",
    "What's something you handled this week better than you would have last year?",
    "If this week had a highlight reel, what's the first clip?"
  ]
};

// ---------------------------------------------------------------------------
// Date-seeded selection.
//
// The same three questions all day, because the seed is the date; a different
// trio when that weekday next comes round, because the date has changed.
// Deterministic, so any past page can recompute exactly what it showed.
// ---------------------------------------------------------------------------

const PROMPTS_PER_DAY = 3;

// FNV-1a: small, stable across sessions, no dependencies.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 'YYYY-MM-DD' -> weekday key. Built from parts because new Date('YYYY-MM-DD')
// parses as UTC and can slip a day either side of midnight.
function weekdayKeyForDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAY_KEYS[new Date(y, m - 1, d).getDay()];
}

function themeForDateKey(dateKey) {
  return THEMES[weekdayKeyForDateKey(dateKey)];
}

function questionsForDateKey(dateKey, count = PROMPTS_PER_DAY) {
  const pool = QUESTIONS[weekdayKeyForDateKey(dateKey)];
  const rand = mulberry32(hashString(dateKey));
  const order = pool.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, count).map((i) => pool[i]);
}
