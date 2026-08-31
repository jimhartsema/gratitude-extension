/* The Web Store review ask, shared by the popup and the journal's finish note.
 *
 * Both surfaces draw from one budget so nobody is asked twice for the same
 * milestone. The state lives in sync storage:
 *
 *   review = { asks: 0, done: false }
 *
 * `asks` counts milestones spent, not times rendered. `done` is set the moment
 * someone takes us up on it and is never unset — we have no way of knowing
 * whether a review was actually left, and asking again after someone already
 * went to the trouble would be worse than never asking twice.
 *
 * Two milestones, ever. The first page is the widest possible reach — plenty
 * of people write once and never come back, and there is no later moment to
 * catch them. The trade is that one page is thin ground for an opinion, so
 * that ask stays conditional and forward-looking rather than claiming the
 * habit already exists. Ten mornings is the second chance, aimed at whoever
 * stayed. After that the extension never mentions it again.
 */

const REVIEW_URL =
  'https://chromewebstore.google.com/detail/ljhdeokfmoakelalgdkcgmnikcnhdhdf/reviews';

/* Full sentences rather than a shared tail: "if it's been good company" is
   true of ten mornings and presumptuous after one. */
const REVIEW_MILESTONES = [
  {
    pages: 1,
    sentence:
      "Your first page is written. If this feels like something you'll come back to, a word on the Web Store helps someone else find it.",
  },
  {
    pages: 10,
    sentence:
      "Ten mornings now. If it's been good company, a word on the Web Store helps someone else find it.",
  },
];

async function getReviewState() {
  const { review = { asks: 0, done: false } } = await chrome.storage.sync.get('review');
  return review;
}

/* Returns the milestone to ask about, or null. Counting completed pages rather
   than days installed keeps the ask pointed at people who actually write. */
async function dueReviewMilestone() {
  const state = await getReviewState();
  if (state.done || state.asks >= REVIEW_MILESTONES.length) return null;

  const milestone = REVIEW_MILESTONES[state.asks];
  const map = await getJournalMap();
  const written = Object.values(map).filter(isEntryComplete).length;

  return written >= milestone.pages ? milestone : null;
}

function reviewSentence(milestone) {
  return milestone.sentence;
}

/* Spend this milestone without opening the store — the person said not now,
   or was shown the ask somewhere they could not miss it. */
async function spendReviewAsk() {
  const state = await getReviewState();
  if (state.done) return;
  await chrome.storage.sync.set({ review: { ...state, asks: state.asks + 1 } });
}

async function acceptReview() {
  const state = await getReviewState();
  await chrome.storage.sync.set({ review: { ...state, done: true } });
  chrome.tabs.create({ url: REVIEW_URL });
}
