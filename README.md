# VocabMaster

A clean, academic-focused IELTS vocabulary app built on the Word Smart 1 & 2 word lists.

- **Stack:** Vite + Tailwind CSS v4 + vanilla JavaScript, wrapped with **Capacitor 8** for Android. Backed by **Supabase** (Postgres, Auth, Edge Functions).
- **Design:** friendly, high-contrast system — soft neutral surfaces, a green primary action, pastel category/exercise accents, Plus Jakarta Sans / Inter (self-hosted), tuned for readability in both light and dark modes.

## Features

- **Learn:** book → word-pack → practice flow with four exercise types — flashcards, matching, fill-in-the-blank, and synonym/antonym.
- **Revise:** spaced-repetition review of words you've already seen, most-stale first (driven by `word_progress.next_due`), scoped to a pack or a whole book.
- **AI coach:** a Gemini-powered practice session that targets your wrong-answer history (`suggest-exercise` edge function).
- **Dictionary:** search with the Free Dictionary API and Merriam-Webster audio.
- **Progress & analytics:** XP, levels, daily goals, and per-category stats.
- **Streaks:** daily streak tracking with streak-freeze gifts you can send and receive between friends.
- **Social:** friend requests, a friends list with realtime updates, and head-to-head stat comparison.
- **Reminders:** local practice-reminder notifications (Capacitor Local Notifications).
- **Offline-aware:** cached reads work offline; online-only routes are gated with an offline banner.
- **Platform niceties:** onboarding tour, in-app updates, pull-to-refresh, haptics, and light/dark theming.

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

The AI features rely on a `GEMINI_API_KEY` secret configured server-side (env or
Supabase Vault) for the edge functions — not shipped in the client.

## Build & Android

```bash
npm run build              # → dist/
npx cap add android        # one-time: generate the native project
npm run cap:sync           # copy the web build into android/
npm run cap:open           # open in Android Studio to build the APK
npm run release:apk        # build + sign a release APK (see scripts/release-apk.mjs)
```

Optional branded launcher icon (sources in `assets/`):

```bash
npm run assets             # regenerate brand assets + Android icons
```

## Structure

- `index.html` / `src/main.js` — app shell, hash router, session bootstrap
- `src/screens/` — one module per screen (`render()` + optional `mount()`)
- `src/ui.js`, `src/icons.js`, `src/style.css` — design system + shared components
- `src/lib/` — pure exercise generators plus notifications, offline, streak, and update helpers
- `src/api/` — Supabase data access (queries, dictionary, AI, friends, account, realtime)
- `supabase/` — migrations and edge functions (`dictionary-lookup`, `suggest-exercise`, `enrich-words`, `delete-account`)
- `scripts/` — admin/build jobs (word enrichment, brand assets, signed APK release)
