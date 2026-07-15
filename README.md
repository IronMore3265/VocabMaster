# VocabMaster

A clean, academic-focused IELTS vocabulary app built on the Word Smart 1 & 2 word lists.

- **Stack:** Vite + Tailwind CSS v4 + vanilla JavaScript, wrapped with **Capacitor** for Android. Backed by **Supabase** (Postgres, Auth, Edge Functions).
- **Design:** friendly, high-contrast system — soft neutral surfaces, a green primary action, pastel category/exercise accents, Plus Jakarta Sans / Inter (self-hosted), tuned for readability in both light and dark modes.
- **Features:** onboarding tour, book → word-pack → practice flow (flashcards, matching, fill-in-the-blank, synonym/antonym), dictionary search (Free Dictionary API with Merriam-Webster audio), progress analytics, an AI coach (Gemini) driven by your wrong-answer history, in-app updates, and light/dark theming.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
```

Environment (`.env`, not committed):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Build & Android

```bash
npm run build              # → dist/
npx cap add android        # one-time: generate the native project
npm run cap:sync           # copy the web build into android/
npm run cap:open           # open in Android Studio to build the APK
```

Optional branded launcher icon (sources in `assets/`):

```bash
npx @capacitor/assets generate --android
```

## Structure

- `index.html` / `src/main.js` — app shell + hash router
- `src/screens/` — one module per screen (`render()` + optional `mount()`)
- `src/ui.js`, `src/icons.js`, `src/style.css` — design system + shared components
- `src/lib/` — pure exercise generators (flashcards, matching, fill-blank, syn/ant)
- `src/api/` — Supabase data access (queries, dictionary, AI)
- `supabase/` — migrations and edge functions
- `scripts/` — one-time admin jobs (word enrichment)
