// One-time word enrichment, edge-function variant of scripts/enrich-words.ts
// (runs where the service role key is available). Each invocation processes
// batches of words with enriched_at IS NULL until ~80s elapse, then reports
// progress; call repeatedly until remaining = 0. Gemini key comes from Vault.
//
// For every word: synonyms (2–4), antonyms (0–4), plus new IELTS example
// sentences — 2–3 if the word already has examples, 4–5 if it has none. New
// sentences must contain the headword or an inflection (stem check) so
// fill-in-the-blank can blank them; invalid ones are dropped and the word is
// retried on a later call.

import { createClient } from 'npm:@supabase/supabase-js@2';

const BATCH_SIZE = 40;
const TIME_BUDGET_MS = 80_000;

// Enrichment is a one-time bulk job, kept OFF the gemini-3.5-flash quota that
// the live suggest-exercise task uses. These two current-gen models generate
// on this key and sit in their own quota buckets; the lite fallback carries on
// when the preview model's quota is spent. Overridable via body.models.
const DEFAULT_MODELS = ['gemini-3-flash-preview', 'gemini-flash-lite-latest'];

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function stem(word: string): string {
  return word.toLowerCase().replace(/[ey]$/, '');
}

function sentenceUsesWord(sentence: string, word: string): boolean {
  const pattern = new RegExp(
    `\\b${stem(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`,
    'i',
  );
  return pattern.test(sentence);
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

class GeminiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<Enrichment[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.7,
          maxOutputTokens: 32768,
        },
      }),
    },
  );
  if (!res.ok) throw new GeminiError(res.status, `Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError(502, 'Gemini returned no text');
  return JSON.parse(text) as Enrichment[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const apiKey =
    Deno.env.get('GEMINI_API_KEY') ??
    ((await admin.rpc('get_secret', { secret_name: 'GEMINI_API_KEY' })).data as string | null);
  if (!apiKey) return json({ error: 'missing_gemini_api_key' }, 500);

  const body = await req.json().catch(() => ({}));
  const models: string[] =
    Array.isArray(body?.models) && body.models.length ? body.models : DEFAULT_MODELS;

  const deadline = Date.now() + TIME_BUDGET_MS;
  // Models whose quota is spent for THIS invocation; skipped for later batches.
  const exhausted = new Set<string>();
  const usedModels = new Set<string>();

  let processed = 0;
  const failures: number[] = [];
  let batches = 0;

  while (Date.now() < deadline) {
    const { data: words, error } = await admin
      .from('words')
      .select('id, word, part_of_speech, definition, example_sentences')
      .is('enriched_at', null)
      .order('id')
      .limit(BATCH_SIZE);
    if (error) return json({ error: error.message }, 500);
    if (!words || words.length === 0) break;

    // Try each model in order; on quota (429) or overload (503) skip that model
    // for the rest of this invocation and fall through to the next.
    let enrichments: Enrichment[] | null = null;
    let lastQuotaErr = '';
    for (const model of models) {
      if (exhausted.has(model)) continue;
      try {
        enrichments = await callGemini(model, apiKey, buildPrompt(words as WordInput[]));
        usedModels.add(model);
        break;
      } catch (err) {
        if (err instanceof GeminiError && (err.status === 429 || err.status === 503)) {
          exhausted.add(model);
          lastQuotaErr = err.message;
          continue;
        }
        // Transient/parse error: report so the caller retries this batch.
        return json({
          processed,
          batches,
          failures,
          models: [...usedModels],
          stalled: processed === 0,
          error: `gemini_failed: ${String(err).slice(0, 200)}`,
        });
      }
    }
    if (!enrichments) {
      return json({
        processed,
        batches,
        failures,
        models: [...usedModels],
        exhausted: [...exhausted],
        stalled: processed === 0,
        error: `all_models_exhausted: ${lastQuotaErr.slice(0, 160)}`,
      });
    }

    const byId = new Map(enrichments.map((e) => [e.id, e]));
    for (const word of words as WordInput[]) {
      const enrichment = byId.get(word.id);
      const validSentences = (enrichment?.new_example_sentences ?? []).filter((sentence) =>
        sentenceUsesWord(sentence, word.word),
      );
      if (!enrichment || validSentences.length === 0) {
        failures.push(word.id);
        // Stamp enriched_at anyway? No — leave null so a later call retries it.
        continue;
      }
      const { error: updateError } = await admin
        .from('words')
        .update({
          synonyms: enrichment.synonyms.slice(0, 4),
          antonyms: enrichment.antonyms.slice(0, 4),
          example_sentences: [...(word.example_sentences ?? []), ...validSentences],
          enriched_at: new Date().toISOString(),
        })
        .eq('id', word.id);
      if (updateError) failures.push(word.id);
      else processed++;
    }
    batches++;

    // If a whole batch failed validation, stop so the caller can inspect
    // instead of burning quota on a loop.
    if (processed === 0 && failures.length >= BATCH_SIZE) break;
  }

  const { count: remaining } = await admin
    .from('words')
    .select('id', { count: 'exact', head: true })
    .is('enriched_at', null);

  return json({
    models: [...usedModels],
    exhausted: [...exhausted],
    processed,
    batches,
    failures,
    remaining: remaining ?? -1,
  });
});
