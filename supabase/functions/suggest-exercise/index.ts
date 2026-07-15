// AI exercise suggestion: reads the caller's weak words + per-exercise accuracy
// (via their JWT, so RLS applies), asks Gemini for a 10-item mixed MCQ session
// biased toward the exercise types they miss most, validates the JSON, caches
// it in ai_suggestions, and returns { suggestionId, payload }.
//
// GEMINI_API_KEY comes from env or Supabase Vault (get_secret RPC, service-role
// only); GEMINI_MODEL optionally overrides the model.

import { createClient } from 'npm:@supabase/supabase-js@2';

let cachedGeminiKey: string | null = null;

async function getGeminiKey(): Promise<string | null> {
  const fromEnv = Deno.env.get('GEMINI_API_KEY');
  if (fromEnv) return fromEnv;
  if (cachedGeminiKey) return cachedGeminiKey;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data } = await admin.rpc('get_secret', { secret_name: 'GEMINI_API_KEY' });
  cachedGeminiKey = (data as string | null) ?? null;
  return cachedGeminiKey;
}

interface Option {
  id: string;
  text: string;
}

interface McqItem {
  kind: 'mcq_definition' | 'fill_blank' | 'syn_ant';
  wordId: number;
  word: string;
  prompt: string;
  options: Option[];
  correctOptionId: string;
  mode?: 'synonym' | 'antonym';
  explanation?: string;
  packId?: number;
}

interface GeneratedExercise {
  focusSummary: string;
  items: McqItem[];
}

const MODEL_CANDIDATES = [
  Deno.env.get('GEMINI_MODEL'),
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
].filter((m): m is string => Boolean(m));

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ITEM_COUNT = 10;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    focusSummary: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: ['mcq_definition', 'fill_blank', 'syn_ant'] },
          wordId: { type: 'INTEGER' },
          word: { type: 'STRING' },
          prompt: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { id: { type: 'STRING' }, text: { type: 'STRING' } },
              required: ['id', 'text'],
            },
          },
          correctOptionId: { type: 'STRING' },
          mode: { type: 'STRING', enum: ['synonym', 'antonym'] },
          explanation: { type: 'STRING' },
        },
        required: ['kind', 'wordId', 'word', 'prompt', 'options', 'correctOptionId'],
      },
    },
  },
  required: ['focusSummary', 'items'],
};

// Cross-origin preflight support for the WebView / browser client.
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

async function resolveModel(apiKey: string): Promise<string> {
  for (const model of MODEL_CANDIDATES) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}`, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (res.ok) return model;
  }
  throw new Error(`No Gemini model available among: ${MODEL_CANDIDATES.join(', ')}`);
}

// deno-lint-ignore no-explicit-any
function buildPrompt(words: any[], weakByType: Record<string, number>, wrongCounts: Map<number, number>): string {
  const wordList = words
    .map((w) => {
      const example = (w.example_sentences ?? [])[0] ?? '';
      return `- wordId=${w.id} word="${w.word}" pos=${w.part_of_speech ?? '?'} definition="${w.definition ?? ''}" synonyms=[${(w.synonyms ?? []).join(', ')}] antonyms=[${(w.antonyms ?? []).join(', ')}] example="${example}" timesMissed=${wrongCounts.get(w.id) ?? 0}`;
    })
    .join('\n');

  const typeList =
    Object.entries(weakByType)
      .map(([exerciseType, accuracy]) => `${exerciseType}: ${Math.round(accuracy * 100)}% accuracy`)
      .join(', ') || 'no data yet';

  return `You are the AI coach in an IELTS vocabulary app. The student keeps missing the words below. Build ONE mixed practice session of exactly ${ITEM_COUNT} items drawn ONLY from these words (repeat a word with a different question kind if needed).

Question kinds:
- "mcq_definition": prompt asks which word matches a definition, or what the word means; options are 4 words or 4 short definitions.
- "fill_blank": prompt is a NEW academic-level sentence with the target word replaced by "_____"; options are 4 words (1 correct + 3 plausible same-part-of-speech distractors from the list or common IELTS words).
- "syn_ant": ask for a synonym or antonym of the target word (set "mode"); options are 4 single words.

The student's accuracy by exercise kind: ${typeList}. Bias the mix toward the kinds with LOWEST accuracy (at least half the items), and toward words with higher timesMissed.

Rules:
- Each item: exactly 4 options with ids "a","b","c","d"; exactly one correct; correctOptionId must be one of the option ids; distractors must be clearly wrong but tempting.
- "explanation": one short sentence explaining the correct answer.
- "focusSummary": 1-2 encouraging sentences naming the patterns you see (e.g. weak verbs, confusing near-synonyms). No markdown.
- wordId and word must come verbatim from the list.

Words:
${wordList}`;
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<GeneratedExercise> {
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
          temperature: 0.8,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text) as GeneratedExercise;
}

/** Drops malformed items; returns null if too few survive. */
function validate(
  payload: GeneratedExercise,
  validWordIds: Map<number, number | null>,
): GeneratedExercise | null {
  if (!payload || typeof payload.focusSummary !== 'string' || !Array.isArray(payload.items)) {
    return null;
  }
  const items = payload.items.filter((item) => {
    if (!['mcq_definition', 'fill_blank', 'syn_ant'].includes(item.kind)) return false;
    if (!validWordIds.has(item.wordId)) return false;
    if (!Array.isArray(item.options) || item.options.length !== 4) return false;
    if (!item.options.some((option) => option.id === item.correctOptionId)) return false;
    if (typeof item.prompt !== 'string' || item.prompt.length < 5) return false;
    return true;
  });
  if (items.length < 5) return null;
  for (const item of items) {
    item.packId = validWordIds.get(item.wordId) ?? undefined;
  }
  return { focusSummary: payload.focusSummary, items: items.slice(0, ITEM_COUNT) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const geminiKey = await getGeminiKey();
  if (!geminiKey) return json({ error: 'missing_gemini_api_key' }, 500);

  // Client bound to the caller's JWT: all reads/writes below go through RLS.
  const authHeader = req.headers.get('Authorization') ?? '';
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await client.auth.getUser();
  if (!userData?.user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  if (!force) {
    const since = new Date(Date.now() - CACHE_MAX_AGE_MS).toISOString();
    const { data: existing } = await client
      .from('ai_suggestions')
      .select('id, payload')
      .eq('status', 'ready')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return json({ suggestionId: existing.id, payload: existing.payload, cached: true });
  }

  const { data: weakWords, error: weakError } = await client
    .from('weak_words')
    .select('id, pack_id, wrong_count')
    .limit(12);
  if (weakError) return json({ error: weakError.message }, 500);
  if (!weakWords || weakWords.length < 4) {
    return json({
      error: 'not_enough_data',
      message: 'Practice a bit more first — the AI coach needs at least 4 words you struggle with.',
    });
  }

  const wordIds = weakWords.map((w) => w.id);
  const [{ data: words, error: wordsError }, { data: accuracy }] = await Promise.all([
    client
      .from('words')
      .select('id, word, part_of_speech, definition, example_sentences, synonyms, antonyms')
      .in('id', wordIds),
    client.from('exercise_accuracy').select('*'),
  ]);
  if (wordsError || !words) return json({ error: wordsError?.message ?? 'words_fetch_failed' }, 500);

  const weakByType: Record<string, number> = {};
  for (const row of accuracy ?? []) {
    if (row.exercise_type) weakByType[row.exercise_type] = Number(row.accuracy ?? 0);
  }
  const wrongCounts = new Map(weakWords.map((w) => [w.id, w.wrong_count ?? 0]));
  const packByWord = new Map(weakWords.map((w) => [w.id, w.pack_id]));

  const model = await resolveModel(geminiKey);
  const prompt = buildPrompt(words, weakByType, wrongCounts);

  let generated: GeneratedExercise | null = null;
  for (let attempt = 0; attempt < 2 && !generated; attempt++) {
    try {
      generated = validate(await callGemini(model, geminiKey, prompt), packByWord);
    } catch (err) {
      if (attempt === 1) return json({ error: `gemini_failed: ${String(err).slice(0, 200)}` }, 502);
    }
  }
  if (!generated) return json({ error: 'generation_invalid' }, 502);

  const { data: inserted, error: insertError } = await client
    .from('ai_suggestions')
    .insert({ user_id: userData.user.id, payload: generated })
    .select('id')
    .single();
  if (insertError) return json({ error: insertError.message }, 500);

  return json({ suggestionId: inserted.id, payload: generated });
});
