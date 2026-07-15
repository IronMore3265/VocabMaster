// User-facing changelog. Each release lists its changes, one short sentence per
// point so anyone can understand what changed. Newest release first.
export const CHANGELOG = [
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
