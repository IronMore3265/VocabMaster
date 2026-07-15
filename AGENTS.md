# VocabMaster — agent notes

## Stack

Vite + Tailwind CSS v4 + **vanilla JavaScript** (no framework, no TypeScript in the
app), wrapped with **Capacitor 8** for Android. Backend is **Supabase** (Postgres,
Auth, Edge Functions) under `supabase/`.

## Conventions

- **Screens** live in `src/screens/` as ES modules exporting `render(...params)`
  (returns an HTML string) and an optional `mount(root, ...params)` (wires events,
  returns a cleanup function). Route params come from the hash regexes in
  `src/main.js`.
- **Routing** is hash-based (`#/route`) in `src/router.js`; navigate with
  `navigate('#/...')` and `[data-nav="#/..."]` attributes. `main.js` gates routes
  on onboarding + auth state.
- **Styling** is Tailwind utilities against the "Academic Clarity" tokens defined
  in `src/style.css` (`@theme`). Dark mode is the `.dark` class on `<html>`.
- **Icons** are Lucide, inlined as SVG via `src/icons.js` (`icon('name')`); add new
  glyphs to the `ICONS` map, keyed by the app's own vocabulary.
- **Data** goes through `src/api/*` (Supabase). A tiny promise cache in
  `src/api/queries.js` replaces react-query; call `invalidate(prefix)` after writes.
- Keep the app dependency-light. Prefer web platform APIs over extra Capacitor
  plugins (e.g. `navigator.vibrate` for haptics).

## Supabase

The schema, RLS, views, RPCs (`record_attempt`) and edge functions
(`dictionary-lookup`, `suggest-exercise`, `enrich-words`) are unchanged by the
web/Capacitor migration. See `supabase/migrations/` and `supabase/functions/`.
