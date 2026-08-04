// ---- Date helpers ----
function formatDateKey(key, opts) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts || {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

function hasContent(entry) {
  if (!entry) return false;
  const values = [...(entry.grateful || []), ...(entry.great || []), entry.affirmation || ''];
  return values.some((v) => v && v.trim());
}

// ---- Book cover intro: hold, swing open, riffle through recent pages ----
// Returns a handle for closing the book again later, or null when there is no
// book to animate (reduced motion).
function runBookIntro(dateLabel) {
  const stage = document.getElementById('book-stage');
  if (!stage) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    stage.remove();
    return null;
  }

  // Sit the book exactly over the real page card so the reveal is seamless.
  const pageEl = document.querySelector('.page');
  const book = stage.querySelector('.book');
  function sizeBook() {
    if (!pageEl || !book) return;
    const r = pageEl.getBoundingClientRect();
    book.style.left = `${r.left}px`;
    book.style.top = `${r.top}px`;
    book.style.width = `${r.width}px`;
    book.style.height = `${r.height}px`;
    book.style.transform = 'none';
  }
  sizeBook();

  // The page keeps changing size after this first measure — the webfont
  // swaps in, renderPage() fills the questions and may reveal the nav, and
  // the window can be resized. Track it continuously instead of guessing
  // when it has settled, or the cover ends up a different size to the page.
  if (window.ResizeObserver) {
    new ResizeObserver(sizeBook).observe(pageEl);
  }
  window.addEventListener('resize', sizeBook);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sizeBook);
  }

  const timers = [];
  let opened = false;

  function openBook() {
    if (opened) return;
    opened = true;
    sizeBook(); // final measure right before the reveal
    stage.classList.add('opening');
    timers.push(setTimeout(() => stage.classList.add('riffling'), 620));
    timers.push(setTimeout(() => stage.classList.add('removed'), 3100));
  }

  function skip() {
    if (stage.classList.contains('removed')) return;
    timers.forEach(clearTimeout);
    stage.classList.add('removed');
  }

  // The book waits for the reader — a first click opens it, another skips ahead.
  stage.addEventListener('click', () => {
    if (!opened) openBook();
    else skip();
  });

  return {
    // Swing the cover back over the finished page. onClosed fires once it has
    // settled, so the thank-you note lands on a shut book.
    close(onClosed) {
      timers.forEach(clearTimeout);
      sizeBook();
      // The cover is the only thing that should move on the way back; the
      // riffle sheets go back to lying flat underneath it.
      stage.classList.remove('removed', 'riffling');
      stage.style.pointerEvents = 'none';
      // The board has to start from where it swung open to, so it keeps
      // .opening for a beat — dropping that class is the close. The reflow
      // commits the open angle first, so the swing has somewhere to come from.
      // Deliberately a timer rather than rAF: if the tab is hidden when the
      // page is finished, rAF never fires and the book would hang half-shut.
      stage.classList.add('opening');
      void stage.offsetWidth;
      timers.push(setTimeout(() => {
        stage.classList.add('closing');
        stage.classList.remove('opening');
        timers.push(setTimeout(onClosed, 900));
      }, 20));
    },
    // And open it again on the way out, back onto the page just written.
    reopen() {
      sizeBook();
      stage.classList.remove('closing');
      stage.classList.add('opening');
      timers.push(setTimeout(() => {
        stage.classList.add('removed');
        stage.style.pointerEvents = '';
      }, 1060));
    }
  };
}

// Paint the most recent real entries onto the riffle sheets so the book
// flips through actual written pages before landing on today.
function fillRiffleSheets(recent) {
  const sheets = document.querySelectorAll('.sheet');
  sheets.forEach((sheet, i) => {
    const item = recent[i];
    if (!item) return; // leave blank paper for a full-looking riffle
    const [key, entry] = item;
    const lines = (entry.grateful || []).filter((v) => v && v.trim()).slice(0, 3);
    const dateStr = formatDateKey(key, { weekday: 'short', month: 'short', day: 'numeric' });
    const linesHtml = lines
      .map((v) => `<div class="sheet-line">${escapeHtml(v)}</div>`)
      .join('');
    sheet.innerHTML = `<div class="sheet-content"><div class="sheet-date">${dateStr}</div>${linesHtml}</div>`;
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

document.addEventListener('DOMContentLoaded', async () => {
  const todayKey = getLocalDateKey();

  const page = document.querySelector('.page');
  const dateHeading = document.getElementById('date-heading');
  const gratefulInputs = [0, 1, 2].map((i) => document.getElementById(`grateful-${i}`));
  const readbackEls = [0, 1, 2].map((i) => document.getElementById(`readback-${i}`));
  const gratefulHint = document.getElementById('grateful-hint');
  const themeChip = document.getElementById('theme-chip');
  const questionEls = [0, 1, 2].map((i) => document.getElementById(`question-${i}`));
  const doneBtn = document.getElementById('done-btn');
  const doneState = document.getElementById('done-state');
  const editBtn = document.getElementById('edit-btn');
  const readonlyNote = document.getElementById('readonly-note');
  const pageNav = document.getElementById('page-nav');
  const navPrev = document.getElementById('nav-prev');
  const navNext = document.getElementById('nav-next');
  const navToday = document.getElementById('nav-today');
  const finishNote = document.getElementById('finish-note');
  const finishBody = document.getElementById('finish-body');
  const finishCount = document.getElementById('finish-count');
  const finishBtn = document.getElementById('finish-btn');

  const allInputs = [...gratefulInputs];

  // Snap to whole lines so the ruled background always ends on a rule.
  function autoGrow(el) {
    const line = parseFloat(getComputedStyle(el).lineHeight) || 34;
    el.style.height = 'auto';
    const rows = Math.max(2, Math.ceil(el.scrollHeight / line));
    el.style.height = `${rows * line}px`;
  }

  const todayLabel = formatDateKey(todayKey);
  dateHeading.textContent = todayLabel;
  const book = runBookIntro(todayLabel);

  // Today's three themed prompts, seeded by the date (see questions.js).
  const todayQuestions = questionsForDateKey(todayKey);

  // ---- Load history and build the ordered list of "pages" ----
  const allEntries = await getJournalMap();
  if (!allEntries[todayKey]) allEntries[todayKey] = blankJournalEntry();

  // Every day is a page, written or not — a calendar you can walk rather than
  // a list of the days you happened to fill in. Blank days still show what was
  // asked, and the days ahead show what is coming.
  const DAYS_BACK_MIN = 13;   // always at least a fortnight to leaf through
  const DAYS_AHEAD = 6;       // a week of upcoming pages, then Next stops

  function shiftKey(key, days) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return getLocalDateKey(date);
  }

  const writtenKeys = Object.keys(allEntries).filter((k) => hasContent(allEntries[k])).sort();
  const earliest = writtenKeys.length
    ? [writtenKeys[0], shiftKey(todayKey, -DAYS_BACK_MIN)].sort()[0]
    : shiftKey(todayKey, -DAYS_BACK_MIN);

  let pageKeys = [];
  for (let k = earliest; k <= shiftKey(todayKey, DAYS_AHEAD); k = shiftKey(k, 1)) {
    pageKeys.push(k);
  }

  let currentIndex = pageKeys.indexOf(todayKey);
  // Which page is being re-opened for editing. Any day up to today can be
  // filled in; the future stays closed until it arrives.
  let editingKey = null;
  let isTurning = false;

  // The page currently on screen, and the questions it is showing. The save
  // path follows these rather than assuming today.
  let currentKey = todayKey;
  let currentQuestions = todayQuestions;

  const isFutureKey = (k) => k > todayKey;

  // Most recent written pages first, up to the number of riffle sheets.
  const recent = writtenKeys.filter((k) => k !== todayKey).slice(-6).reverse()
    .map((k) => [k, allEntries[k]]);
  fillRiffleSheets(recent);

  // ---- Autosave (whichever page is open, today or earlier) ----
  let saveTimer = null;

  function collectEntry(base) {
    return {
      grateful: gratefulInputs.map((el) => el.value),
      // Carried through untouched. These two prompts are no longer on the
      // page, but anything written under them before is kept rather than
      // overwritten on the next save.
      great: base.great,
      affirmation: base.affirmation,
      // Stored so a page always shows the questions it was written against,
      // even if the selection logic or the question list changes later.
      questions: currentQuestions,
      completedAt: base.completedAt
    };
  }

  function writeCurrent() {
    const key = currentKey;
    const entry = collectEntry(allEntries[key] || blankJournalEntry());
    allEntries[key] = entry;
    saveJournalEntry(key, entry);
  }

  function flushSave() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    writeCurrent();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      writeCurrent();
      saveTimer = null;
    }, 500);
  }

  // ---- Render a given page ----
  function renderPage(index) {
    currentIndex = index;
    const key = pageKeys[index];
    const isToday = key === todayKey;
    const isFuture = key > todayKey;
    const stored = allEntries[key];
    const entry = stored || blankJournalEntry();
    const complete = isEntryComplete(entry);
    // Yesterday can still be written; tomorrow cannot.
    const editable = !isFuture && (!complete || editingKey === key);

    dateHeading.textContent = formatDateKey(key);

    // Which questions a page shows, in order of authority:
    //   today            -> the trio computed for today
    //   written page     -> the questions stored with it, so it always shows
    //                       what it was actually written against
    //   legacy written   -> none; falls back to plain numbered lines
    //   blank / upcoming -> recomputed from the date, which is exactly what
    //                       was (or will be) asked, since selection is seeded
    //                       by the date and never drifts
    let questions;
    if (isToday) {
      questions = todayQuestions;
    } else if (Array.isArray(entry.questions) && entry.questions.length === questionEls.length) {
      questions = entry.questions;
    } else if (stored && hasContent(stored)) {
      questions = null;
    } else {
      questions = questionsForDateKey(key);
    }

    currentKey = key;
    currentQuestions = questions || [];

    themeChip.hidden = !questions;
    if (questions) themeChip.textContent = themeForDateKey(key);
    // The number stays put either way; only the question text changes, so a
    // pre-theme page still shows its numbered lines.
    questionEls.forEach((el, i) => {
      el.textContent = questions ? questions[i] : '';
    });

    const grateful = entry.grateful || [];
    gratefulInputs.forEach((el, i) => {
      el.value = grateful[i] || '';
      el.readOnly = !editable;
      el.hidden = !editable;
      if (editable) autoGrow(el);
    });
    // Swap the inputs for wrapping text once a page is no longer editable,
    // so a long answer can actually be read back in full.
    readbackEls.forEach((el, i) => {
      el.textContent = grateful[i] || '';
      el.hidden = editable;
    });

    // Footer state
    doneBtn.hidden = !editable;
    doneBtn.textContent = isToday ? 'Done for today' : 'Save this page';
    editBtn.textContent = isToday ? "Edit today's page" : 'Edit this page';
    doneState.hidden = !(complete && editingKey !== key);
    readonlyNote.hidden = !isFuture;
    if (isFuture) {
      readonlyNote.textContent = `Opens ${formatDateKey(key, { weekday: 'long' })}`;
    }
    gratefulHint.hidden = true;

    // Navigation. Always on show, even on day one — hiding it until history
    // existed meant nobody discovered they could turn pages at all. The ends
    // simply disable instead.
    pageNav.hidden = false;
    navPrev.disabled = index === 0;
    navNext.disabled = index === pageKeys.length - 1;
    navToday.hidden = isToday;
    navPrev.title = index === 0 ? 'This is your earliest page' : '';
  }

  // ---- Page-turn between days ----
  function goTo(index, dir) {
    if (isTurning || index < 0 || index >= pageKeys.length || index === currentIndex) return;
    flushSave();
    editingKey = null;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      renderPage(index);
      return;
    }

    isTurning = true;
    page.style.transformOrigin = dir === 'back' ? 'left center' : 'right center';
    page.classList.add('flipping');
    page.style.opacity = '0';
    page.style.transform = dir === 'back' ? 'rotateY(-90deg)' : 'rotateY(90deg)';

    setTimeout(() => {
      renderPage(index);
      page.classList.remove('flipping');
      page.style.transform = dir === 'back' ? 'rotateY(90deg)' : 'rotateY(-90deg)';
      void page.offsetWidth; // reflow so the next transition runs
      page.classList.add('flipping');
      page.style.transform = 'rotateY(0deg)';
      page.style.opacity = '1';
      setTimeout(() => {
        page.classList.remove('flipping');
        page.style.transform = '';
        page.style.transformOrigin = '';
        isTurning = false;
      }, 260);
    }, 260);
  }

  navPrev.addEventListener('click', () => goTo(currentIndex - 1, 'back'));
  navNext.addEventListener('click', () => goTo(currentIndex + 1, 'forward'));
  // Today is no longer the last page — there are upcoming ones after it — so
  // this has to seek today's index rather than jump to the end, and turn in
  // whichever direction today happens to lie.
  navToday.addEventListener('click', () => {
    const target = pageKeys.indexOf(todayKey);
    goTo(target, target > currentIndex ? 'forward' : 'back');
  });

  document.addEventListener('keydown', (e) => {
    // While the thank-you note is up it owns the keyboard — Escape dismisses
    // it, and the arrows must not turn pages behind it.
    if (!finishNote.hidden) {
      if (e.key === 'Escape') dismissNote();
      return;
    }
    const el = document.activeElement;
    const typing = el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && !el.readOnly;
    if (typing) return;
    if (e.key === 'ArrowLeft') goTo(currentIndex - 1, 'back');
    if (e.key === 'ArrowRight') goTo(currentIndex + 1, 'forward');
  });

  // ---- Input handlers (today, or any earlier day) ----
  allInputs.forEach((el) => {
    el.addEventListener('input', () => {
      autoGrow(el);
      if (isFutureKey(currentKey)) return;
      gratefulHint.hidden = true;
      scheduleSave();
    });
  });

  window.addEventListener('beforeunload', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });

  // ---- Thank-you note once the book has shut ----
  // Four ways of saying it, so a note you meet every morning doesn't wear out.
  const FINISH_NOTES = [
    'That is amazing! Another day of gratitude. Have a wonderful day!',
    'Beautiful. Another day of gratitude, noticed and written down. Have a wonderful day!',
    'Lovely work — three more things the day would otherwise have swallowed. Enjoy every bit of it!',
    'Wonderful. Another page in the book, another day of gratitude. Go and have a lovely one!'
  ];
  // "Another day of gratitude" doesn't fit a day being filled in after the fact.
  const PAST_NOTE = 'That day is written down now — nothing lost. Have a wonderful day!';

  function celebrate(isToday) {
    const written = Object.keys(allEntries).filter((k) => isEntryComplete(allEntries[k])).length;
    finishBody.textContent = isToday
      ? FINISH_NOTES[written % FINISH_NOTES.length]
      : PAST_NOTE;
    finishCount.textContent = written === 1 ? 'Your first page is written' : `${written} pages written`;
    finishCount.hidden = false;

    function show() {
      finishNote.hidden = false;
      void finishNote.offsetWidth; // commit the hidden state so the fade runs
      setTimeout(() => {
        finishNote.classList.add('visible');
        finishBtn.focus();
      }, 20);
    }

    // Under reduced motion there is no book to close — the note just arrives.
    if (book) book.close(show);
    else show();
  }

  function dismissNote() {
    if (finishNote.hidden) return;
    finishNote.classList.remove('visible');
    setTimeout(() => {
      finishNote.hidden = true;
      if (book) book.reopen();
      // Back onto the page just written; by now it is finished, so the footer
      // is showing Edit rather than Done.
      (doneBtn.hidden ? editBtn : doneBtn).focus();
    }, 300);
  }

  finishBtn.addEventListener('click', dismissNote);
  // Anywhere off the card also closes it.
  finishNote.addEventListener('click', (e) => {
    if (e.target === finishNote) dismissNote();
  });

  // ---- Mark the open page done ----
  doneBtn.addEventListener('click', () => {
    const key = currentKey;
    if (isFutureKey(key)) return;
    const draft = collectEntry(allEntries[key] || blankJournalEntry());
    if (!draft.grateful.some((v) => v && v.trim())) {
      gratefulHint.hidden = false;
      gratefulInputs[0].focus();
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = null;
    draft.completedAt = Date.now();
    allEntries[key] = draft;
    editingKey = null;
    saveJournalEntry(key, draft);
    renderPage(currentIndex);
    celebrate(key === todayKey);
  });

  // ---- Reopen a finished page ----
  editBtn.addEventListener('click', () => {
    editingKey = currentKey;
    renderPage(currentIndex);
    gratefulInputs[0].focus();
  });

  renderPage(currentIndex);
});
