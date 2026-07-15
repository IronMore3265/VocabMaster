// User-facing changelog. Each release lists its changes, one short sentence per
// point so anyone can understand what changed. Newest release first.
export const CHANGELOG = [
  {
    version: '4.0.0',
    date: '2026-07-15',
    notes: [
      'Refreshed the app with a new blue theme so the brand colour is no longer confused with the green “correct” colour.',
      'Redesigned the Word Smart 1 & 2 cards and gave each practice type its own large, centered tile.',
      'Flashcards now grow when you flip them, so the full definition, examples and synonyms fit without scrolling.',
      'The AI Coach now has its own tab next to Dictionary, and explains what it does the first time you open it.',
      'Rebuilt the Analytics dashboard with a weekly practice chart, a library-mastery bar and a best-streak stat.',
      'Sign-in now remembers your email when you tick “Remember me”, so you only need to type your password.',
      'Onboarding puts Back beside Next and shows Skip tour as a clear button.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-15',
    notes: [
      'Refreshed the whole look with a friendlier, higher-contrast colour system that is much easier to read in dark mode.',
      'Flashcards now show synonyms, antonyms and up to three example sentences on the back.',
      'Fixed matching practice so tapping the wrong meaning clearly flashes red instead of doing nothing.',
      'Sped up dictionary lookups and made them more reliable by using the free dictionary first, with Merriam-Webster for audio.',
      'Updates now download and install right inside the app instead of sending you to a web page.',
      'Cleaned up notes and example boxes with a softer, label-based style.',
    ],
  },
  {
    version: '0.2.2',
    date: '2026-07-15',
    notes: [
      'Fixed pronunciation audio and the AI coach, which were blocked from reaching the dictionary and AI services.',
      'Switched the whole app to the Google Sans Flex typeface for a cleaner, more consistent look.',
      'Centered the screen titles and lined the menu and settings icons up with them.',
      'Added a show/hide toggle to password fields so you can check what you typed.',
      'Added account deletion that also erases all of your data from the server.',
      'Added an in-app update check against GitHub releases, plus this changelog.',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-07-14',
    notes: [
      'Added a password strength policy with live requirement checks while signing up.',
      'Fixed the authentication configuration and gave the app a new book icon.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-14',
    notes: [
      'Rebuilt the app on Vite, Tailwind, and vanilla JavaScript, wrapped for Android with Capacitor.',
    ],
  },
];
