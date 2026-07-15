// Dictionary proxy: Merriam-Webster Collegiate first, dictionaryapi.dev to fill
// missing IPA/audio, 30-day shared cache in public.dictionary_cache. Keys stay
// server-side (secrets: MW_API_KEY). verify_jwt is on, so only signed-in users
// can call this.

import { createClient } from 'npm:@supabase/supabase-js@2';

interface DictionaryEntry {
  headword: string;
  pos: string | null;
  pronunciation: string | null;
  ipa: string | null;
  audioUrl: string | null;
  definitions: string[];
}

interface DictionaryPayload {
  word: string;
  entries?: DictionaryEntry[];
  suggestions?: string[];
}

const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Merriam-Webster audio subdirectory rules. */
function mwAudioUrl(audio: string): string {
  let subdir: string;
  if (audio.startsWith('bix')) subdir = 'bix';
  else if (audio.startsWith('gg')) subdir = 'gg';
  else if (/^[^a-zA-Z]/.test(audio)) subdir = 'number';
  else subdir = audio[0];
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audio}.mp3`;
}

// deno-lint-ignore no-explicit-any
function normalizeMw(word: string, raw: any[]): DictionaryPayload {
  if (raw.length > 0 && typeof raw[0] === 'string') {
    return { word, suggestions: raw.slice(0, 6) as string[] };
  }
  const entries: DictionaryEntry[] = [];
  for (const entry of raw) {
    const headword: string = (entry?.hwi?.hw ?? '').replaceAll('*', '');
    if (!headword) continue;
    // Only homographs of the searched word itself (skip run-ons like "abatable").
    if (headword.toLowerCase() !== word) continue;
    const prs = entry?.hwi?.prs?.[0];
    const audio = prs?.sound?.audio;
    entries.push({
      headword,
      pos: entry?.fl ?? null,
      pronunciation: prs?.mw ?? null,
      ipa: null,
      audioUrl: audio ? mwAudioUrl(audio) : null,
      definitions: (entry?.shortdef ?? []).slice(0, 4),
    });
    if (entries.length === 4) break;
  }
  return { word, entries };
}

// deno-lint-ignore no-explicit-any
function supplementFromFreeDict(payload: DictionaryPayload, raw: any[]): void {
  const phonetics = raw?.[0]?.phonetics ?? [];
  // deno-lint-ignore no-explicit-any
  const ipa = phonetics.find((p: any) => p?.text)?.text ?? null;
  // deno-lint-ignore no-explicit-any
  const audio = phonetics.find((p: any) => p?.audio)?.audio ?? null;
  for (const entry of payload.entries ?? []) {
    entry.ipa = entry.ipa ?? ipa;
    entry.audioUrl = entry.audioUrl ?? audio;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const body = await req.json().catch(() => null);
  const word = String(body?.word ?? '')
    .trim()
    .toLowerCase();
  if (!word || word.length > 60) return json({ error: 'invalid_word' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: cached } = await admin
    .from('dictionary_cache')
    .select('payload, fetched_at')
    .eq('word', word)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_MAX_AGE_MS) {
    return json(cached.payload);
  }

  const mwKey = Deno.env.get('MW_API_KEY');
  if (!mwKey) return json({ error: 'missing_mw_api_key' }, 500);

  const mwRes = await fetch(
    `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${mwKey}`,
  );
  if (!mwRes.ok) return json({ error: 'merriam_webster_unavailable' }, 502);
  const payload = normalizeMw(word, await mwRes.json());

  // Suggestions ("did you mean") are not cached — they aren't a real entry.
  if (payload.suggestions) return json(payload);

  const needsSupplement = (payload.entries ?? []).some((e) => !e.audioUrl || !e.ipa);
  if (needsSupplement || (payload.entries ?? []).length === 0) {
    try {
      const freeRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      );
      if (freeRes.ok) {
        const free = await freeRes.json();
        if ((payload.entries ?? []).length === 0 && Array.isArray(free)) {
          // MW had nothing usable; build entries from the free dictionary.
          payload.entries = free.slice(0, 1).flatMap(
            // deno-lint-ignore no-explicit-any
            (fe: any) =>
              // deno-lint-ignore no-explicit-any
              (fe?.meanings ?? []).slice(0, 3).map((meaning: any) => ({
                headword: fe?.word ?? word,
                pos: meaning?.partOfSpeech ?? null,
                pronunciation: null,
                ipa: fe?.phonetic ?? null,
                audioUrl: null,
                definitions: (meaning?.definitions ?? [])
                  // deno-lint-ignore no-explicit-any
                  .map((d: any) => d?.definition)
                  .filter(Boolean)
                  .slice(0, 3),
              })),
          );
        }
        supplementFromFreeDict(payload, Array.isArray(free) ? free : []);
      }
    } catch {
      // Supplement is best-effort; MW data alone is fine.
    }
  }

  await admin.from('dictionary_cache').upsert({
    word,
    payload,
    fetched_at: new Date().toISOString(),
  });

  return json(payload);
});
