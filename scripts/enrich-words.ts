/**
 * One-time enrichment batch (plan §3): for every row in public.words, Gemini
 * generates synonyms (2–4), antonyms (0–4 where sensible), and additional
 * example sentences — 2–3 for words that already have examples, 4–5 for words
 * with none. New sentences must contain the headword (or a natural inflection)
 * so fill-in-the-blank can blank it out; sentences failing that check are
 * dropped and the word is retried on the next run.
 *
 * Resumable: only rows with enriched_at IS NULL are processed.
 *
 * Usage (Node >= 24 runs TypeScript directly):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... \
 *   node scripts/enrich-words.ts
 *
 * Optional: GEMINI_MODEL (default tries gemini-3.5-flash, then older Flash).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://ylxqmykemzognlnqmjuv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BATCH_SIZE = 40;

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
].filter((m): m is string => Boolean(m));

if (!SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface WordInput {
  id: number;
  word: string;
  part_of_speech: string | null;
  definition: string | null;
  example_sentences: string[] | null;
}

interface Enrichment {
  id: number;
  synonyms: string[];
  antonyms: string[];
  new_example_sentences: string[];
}

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'INTEGER' },
      synonyms: { type: 'ARRAY', items: { type: 'STRING' } },
      antonyms: { type: 'ARRAY', items: { type: 'STRING' } },
      new_example_sentences: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['id', 'synonyms', 'antonyms', 'new_example_sentences'],
  },
};

async function resolveModel(): Promise<string> {
  for (const model of MODEL_CANDIDATES) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}`, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY! },
    });
    if (res.ok) return model;
  }
  throw new Error(`None of the candidate models are available: ${MODEL_CANDIDATES.join(', ')}`);
}

function buildPrompt(words: WordInput[]): string {
  const list = words
    .map((w) => {
      const wanted = (w.example_sentences?.length ?? 0) > 0 ? '2-3' : '4-5';
      return `- id=${w.id} word="${w.word}" pos=${w.part_of_speech ?? '?'} definition="${w.definition ?? ''}" new_sentences_wanted=${wanted}`;
    })
    .join('\n');

  return `You are helping build an IELTS vocabulary app. For EACH word below, produce:
- "synonyms": 2-4 common single-word synonyms matching the given definition and part of speech.
- "antonyms": 2-4 single-word antonyms if the word has natural opposites, otherwise an empty array.
- "new_example_sentences": exactly new_sentences_wanted new example sentences at an academic / IELTS level.

Sentence rules (critical):
- Every sentence MUST contain the exact headword or a natural inflection of it (e.g. "abate" -> "abated", "abating").
- Vary the contexts (academic writing, news, everyday life). 12-25 words each.
- Do not reuse or paraphrase the definition as a sentence.

Return a JSON array with one object per word, keyed by the given id.

Words:
${list}`;
}

async function callGemini(model: string, prompt: string): Promise<Enrichment[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.7,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text part');
  return JSON.parse(text) as Enrichment[];
}

function stem(word: string): string {
  return word.toLowerCase().replace(/[ey]$/, '');
}

function sentenceUsesWord(sentence: string, word: string): boolean {
  const pattern = new RegExp(`\\b${stem(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`, 'i');
  return pattern.test(sentence);
}

async function main() {
  const model = await resolveModel();
  console.log(`Using model: ${model}`);

  let processed = 0;
  const failures: number[] = [];

  for (;;) {
    const { data: words, error } = await supabase
      .from('words')
      .select('id, word, part_of_speech, definition, example_sentences')
      .is('enriched_at', null)
      .order('id')
      .limit(BATCH_SIZE);
    if (error) throw error;
    if (!words || words.length === 0) break;

    console.log(`Batch: ids ${words[0].id}–${words[words.length - 1].id} (${words.length} words)`);

    let enrichments: Enrichment[];
    try {
      enrichments = await callGemini(model, buildPrompt(words as WordInput[]));
    } catch (err) {
      console.error('  Gemini call failed, waiting 30s then retrying once:', err);
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      enrichments = await callGemini(model, buildPrompt(words as WordInput[]));
    }

    const byId = new Map(enrichments.map((e) => [e.id, e]));
    for (const word of words as WordInput[]) {
      const enrichment = byId.get(word.id);
      if (!enrichment) {
        failures.push(word.id);
        continue;
      }
      const validSentences = enrichment.new_example_sentences.filter((sentence) =>
        sentenceUsesWord(sentence, word.word),
      );
      if (validSentences.length === 0) {
        console.warn(`  id=${word.id} "${word.word}": no valid sentences, will retry next run`);
        failures.push(word.id);
        continue;
      }
      const { error: updateError } = await supabase
        .from('words')
        .update({
          synonyms: enrichment.synonyms.slice(0, 4),
          antonyms: enrichment.antonyms.slice(0, 4),
          example_sentences: [...(word.example_sentences ?? []), ...validSentences],
          enriched_at: new Date().toISOString(),
        })
        .eq('id', word.id);
      if (updateError) {
        console.error(`  id=${word.id} update failed:`, updateError.message);
        failures.push(word.id);
      } else {
        processed++;
      }
    }

    console.log(`  done (total processed: ${processed})`);
    await new Promise((resolve) => setTimeout(resolve, 2_000)); // rate-limit cushion
  }

  console.log(`Finished. Enriched ${processed} words.`);
  if (failures.length > 0) {
    console.log(`Failed/skipped ids (re-run to retry): ${failures.join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
