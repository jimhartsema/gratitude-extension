// Shared date/storage helpers for the daily journal.
// Loaded by background.js (importScripts) and by popup.html / journal.html (<script>).

const JOURNAL_STORAGE_KEY = 'journal';

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function blankJournalEntry() {
  return { grateful: ['', '', ''], great: ['', '', ''], affirmation: '', completedAt: null };
}

function isEntryComplete(entry) {
  return !!(entry && entry.completedAt);
}

async function getJournalMap() {
  const { [JOURNAL_STORAGE_KEY]: journal = {} } = await chrome.storage.local.get(JOURNAL_STORAGE_KEY);
  return journal;
}

async function getJournalEntry(dateKey) {
  const journal = await getJournalMap();
  return journal[dateKey] || blankJournalEntry();
}

async function saveJournalEntry(dateKey, entry) {
  const journal = await getJournalMap();
  journal[dateKey] = entry;
  await chrome.storage.local.set({ [JOURNAL_STORAGE_KEY]: journal });
}
