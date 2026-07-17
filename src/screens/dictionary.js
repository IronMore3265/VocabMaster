import { fetchBookmarks, lookupWord, toggleBookmark } from '../api/dictionary.js';
import { clearRecentSearches, getRecentSearches, pushRecentSearch } from '../store.js';
import { playAudio } from '../lib/feedback.js';
import { appHeader, bottomNav, chip, emptyState, esc, icon, spinner } from '../ui.js';

export function render() {
  return `
  ${appHeader('Dictionary')}
  <main class="pt-page pb-page px-5">
    <div class="flex items-center gap-2.5 bg-surface rounded-full border border-outline-variant px-4 mt-1">
      ${icon('search', 'text-outline text-[22px]')}
      <input data-query type="text" autocapitalize="none" autocomplete="off" autocorrect="off"
        placeholder="Search vocabulary…" enterkeyhint="search"
        class="flex-1 py-3.5 bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none" />
      <button data-clear class="p-1 text-outline hidden">${icon('close', 'text-[20px]')}</button>
    </div>
    <div data-content class="flex flex-col gap-4 mt-4"></div>
  </main>
  ${bottomNav('#/dictionary')}`;
}

export function mount(root) {
  const input = root.querySelector('[data-query]');
  const clearBtn = root.querySelector('[data-clear]');
  const content = root.querySelector('[data-content]');

  let result = null;
  let loading = false;
  let error = false;
  let recent = getRecentSearches();
  let bookmarks = [];

  fetchBookmarks().then((b) => { bookmarks = b; draw(); }).catch(() => {});

  const bookmarkedSet = () => new Set(bookmarks.map((b) => b.word));

  input.addEventListener('input', () => {
    clearBtn.classList.toggle('hidden', !input.value);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(input.value); });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    result = null; error = false;
    draw();
  });

  async function search(word) {
    const trimmed = word.trim();
    if (!trimmed) return;
    input.value = trimmed;
    input.blur();
    clearBtn.classList.remove('hidden');
    loading = true; error = false; result = null; draw();
    try {
      const payload = await lookupWord(trimmed);
      result = payload;
      if (payload.entries?.length) recent = pushRecentSearch(trimmed.toLowerCase());
    } catch {
      error = true;
    }
    loading = false; draw();
  }

  async function onToggleBookmark() {
    const word = result?.word ?? '';
    const bookmarked = bookmarkedSet().has(word);
    // optimistic
    if (bookmarked) bookmarks = bookmarks.filter((b) => b.word !== word);
    else bookmarks = [{ word, created_at: new Date().toISOString() }, ...bookmarks];
    draw();
    try {
      await toggleBookmark({ word, payload: result, bookmarked });
    } catch {
      bookmarks = await fetchBookmarks().catch(() => bookmarks);
      draw();
    }
  }

  function draw() {
    const currentWord = result?.word ?? '';
    const isBookmarked = bookmarkedSet().has(currentWord);
    let html = '';

    if (recent.length > 0) {
      html += `
      <div class="flex flex-col gap-2.5">
        <div class="flex justify-between items-center">
          <h3 class="text-[16px] font-headline text-on-surface">Recent</h3>
          <button data-clear-recent class="text-body-sm text-primary">Clear</button>
        </div>
        <div class="flex flex-wrap gap-2">
          ${recent.map((w) => chip(w, { active: w === currentWord, attrs: `data-search="${esc(w)}"` })).join('')}
        </div>
      </div>`;
    }

    if (loading) html += `<div class="flex justify-center py-6">${spinner()}</div>`;
    if (error) html += `<p class="text-body-sm text-error">Lookup failed. Check your connection and try again.</p>`;

    if (result?.suggestions) {
      html += `
      <div class="flex flex-col gap-2.5">
        <p class="text-body-md text-on-surface-variant">No exact match for “${esc(result.word)}”. Did you mean:</p>
        <div class="flex flex-wrap gap-2">${result.suggestions.map((s) => chip(s, { attrs: `data-search="${esc(s)}"` })).join('')}</div>
      </div>`;
    }

    if (result?.entries?.length) {
      const e0 = result.entries[0];
      html += `
      <div class="bg-surface rounded-3xl p-6 flex flex-col gap-4 shadow-card">
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <h2 class="text-headline-md font-headline text-on-surface">${esc(result.word)}</h2>
            ${e0.ipa || e0.pronunciation ? `<p class="text-body-sm text-on-surface-variant">${esc(e0.ipa ?? `\\${e0.pronunciation}\\`)}</p>` : ''}
          </div>
          ${e0.audioUrl ? `<button data-audio="${esc(e0.audioUrl)}" class="p-1 active:opacity-70">${icon('volume_up', 'text-primary text-[22px]')}</button>` : ''}
          <button data-bookmark class="p-1 active:opacity-70">
            ${icon(isBookmarked ? 'bookmark_added' : 'bookmark_add', `${isBookmarked ? 'text-secondary' : 'text-on-surface-variant'} text-[24px]`)}
          </button>
        </div>
        ${result.entries.map((entry) => `
          <div class="flex flex-col gap-2">
            ${entry.pos ? `<span class="self-start bg-primary-fixed text-on-primary-fixed rounded-full px-3 py-0.5 text-label-sm uppercase">${esc(entry.pos)}</span>` : ''}
            ${entry.definitions.map((d, i) => `
              <div class="flex gap-2">
                <span class="text-body-sm text-outline">${i + 1}.</span>
                <span class="text-body-md text-on-surface flex-1">${esc(d)}</span>
              </div>`).join('')}
          </div>`).join('')}
        ${chipSection('Synonyms', result.synonyms, 'positive')}
        ${chipSection('Antonyms', result.antonyms, 'negative')}
      </div>`;
    }

    if (!result && !loading && bookmarks.length > 0) {
      html += `
      <div class="flex flex-col gap-2.5">
        <h3 class="text-[16px] font-headline text-on-surface">Saved words</h3>
        <div class="flex flex-wrap gap-2">${bookmarks.map((b) => chip(b.word, { attrs: `data-search="${esc(b.word)}"` })).join('')}</div>
      </div>`;
    }

    if (!result && !loading && recent.length === 0 && bookmarks.length === 0) {
      html += emptyState('dictionary', 'Look up any English word', 'Definitions, pronunciation audio\nand bookmarks.');
    }

    content.innerHTML = html;

    content.querySelectorAll('[data-search]').forEach((el) =>
      el.addEventListener('click', () => search(el.getAttribute('data-search'))));
    content.querySelector('[data-clear-recent]')?.addEventListener('click', () => {
      clearRecentSearches(); recent = []; draw();
    });
    content.querySelector('[data-bookmark]')?.addEventListener('click', onToggleBookmark);
    content.querySelector('[data-audio]')?.addEventListener('click', (e) =>
      playAudio(e.currentTarget.getAttribute('data-audio')));
  }

  function chipSection(label, words, tone = 'neutral') {
    if (!words?.length) return '';
    return `
    <div class="flex flex-col gap-2">
      <span class="text-label-sm uppercase text-on-surface-variant">${label}</span>
      <div class="flex flex-wrap gap-2">${words.map((w) => chip(w, { attrs: `data-search="${esc(w)}"`, tone })).join('')}</div>
    </div>`;
  }

  draw();
}
