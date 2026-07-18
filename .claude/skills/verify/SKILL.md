---
name: verify
description: Build, launch, and drive VocabMaster in a headless browser to verify UI changes with screenshots.
---

# Verifying VocabMaster changes

## Build / launch

- `npm run build` — fast (<1s) syntax/bundle check.
- `npm run dev` (background) — serves http://localhost:5173/ with source modules
  importable from the page (needed for the console-invocation tricks below).

## Drive (headless browser)

No local Playwright. Install `playwright-core` in the session scratchpad
(`npm init -y; npm install playwright-core`) and launch with the system Edge —
no browser download needed:

```js
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
```

A fresh context lands on the onboarding tour (no auth). Full-screen overlays and
the offline bar attach to `document.body`, so they can be verified without
signing in.

## Flows worth driving

- **Offline/online bar**: `context.setOffline(true|false)` fires the page's
  `online`/`offline` events; the bar is `.vt-offline-bar`.
- **Celebrations** (streak fire, level-up): invoke directly against the dev
  server's module graph:
  ```js
  page.evaluate(() => import('/src/lib/streakCelebration.js')
    .then((m) => m.showStreakCelebration({ streak: 3 })));  // or showLevelCelebration({ level: 4 })
  ```
  Dismiss with `page.click('[data-continue]')`. Screenshot at staggered
  timeouts to catch entrance-animation frames (entrances run ~0–800ms).
- **Dark mode**: `page.emulateMedia({ colorScheme: 'dark' })` plus
  `document.documentElement.classList.add('dark')` (the app keys styling off
  the `.dark` class).

## Gotchas

- Windows/PowerShell host: `&&` chaining fails in PowerShell 5.1; run
  playwright scripts via `node script.mjs` from the scratchpad.
- Signed-in flows need Supabase credentials — not available headlessly; verify
  overlay/offline/onboarding surfaces instead and say so.
