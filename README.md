# VocabMaster

A clean, academic-focused IELTS vocabulary app built on the Word Smart 1 & 2 word lists.

- **Stack:** React Native (Expo SDK 57, TypeScript, expo-router) + Supabase (Postgres, Auth, Edge Functions)
- **Design:** "Academic Clarity" system — soft neutral surfaces, indigo/emerald accents, pastel exercise tiles, Plus Jakarta Sans / Inter / JetBrains Mono
- **Features:** book → word-pack → practice flow (flashcards, matching, fill-in-the-blank, synonym/antonym), dictionary search (Merriam-Webster), progress analytics, and AI-personalized exercises (Gemini) driven by your wrong-answer history

## Development

```bash
npm install
npx expo start        # scan the QR with Expo Go
```

Environment (`.env`, not committed):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Structure

- `src/app/` — expo-router routes (tabs: Library / Dictionary / Analytics; practice flows)
- `src/lib/theme/` — design tokens + ThemeProvider (light/dark)
- `src/lib/exercises/` — pure exercise generators
- `src/components/` — UI building blocks
- `supabase/` — migrations and edge functions
- `scripts/` — one-time admin jobs (word enrichment)
