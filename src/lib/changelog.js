// User-facing changelog. Each release lists its changes, one short sentence per
// point so anyone can understand what changed. Newest release first.
export const CHANGELOG = [
  {
    version: '5.5.0',
    date: '2026-07-17',
    notes: [
      'Fixed haptic feedback, which never actually worked on Android — the app was asking the phone to vibrate without permission to do so, and the request was being silently ignored.',
      'Friends is now a tab, so it sits alongside Library, Dictionary, AI Coach and Analytics instead of being buried in the menu.',
      'Added friend streaks: practise on the same day as a friend to start one, and keep it alive by both practising before midnight.',
      'Added a Profile page where you can change your display name and pick an avatar.',
      'Added 12 avatars to choose from — your friends see yours next to your name.',
      'The header now shows your avatar instead of a settings gear; Settings moved inside Profile.',
      'The menu no longer repeats the tabs sitting right below it — it now has Profile, Settings, What’s new and Sign out.',
      'The tour now animates each feature as it introduces it, has a slide for Friends, and can be swiped through.',
      'A friend’s streak is now counted in your timezone rather than UTC, so it agrees with the streak on your own Analytics tab.',
    ],
  },
  {
    version: '5.0.0',
    date: '2026-07-17',
    notes: [
      'New app icon — an open book whose pages form a “V” — now used on the launcher, the splash screen, sign-in and both Word Smart book tiles.',
      'Flashcards no longer push “Again” and “Got it” off the screen when you flip a long card; the card scrolls instead and the buttons stay put.',
      'The app no longer redraws itself while you are reading — switching tabs, tapping the tab you are already on, and background sign-in refreshes all leave the page alone.',
      'The flashcard progress bar now slides forward between cards instead of restarting from zero each time.',
      'Synonyms now show as green pills and antonyms as red ones, in both Flashcards and the Dictionary.',
      'Added Friends: share your 6-digit code, connect with someone else’s, and compare streaks, mastery and accuracy.',
      'Added Revise: practise the words you learned longest ago, for a single pack or a whole book.',
      'The AI Coach now mixes in words you have not seen for a while, not only the ones you get wrong.',
      'You can now change your display name from Settings.',
      'The status bar now follows your light or dark theme.',
      'Deleting your account or signing in as someone else now clears your data straight away, without restarting the app.',
      'Smoother analytics: stats count up, the weekly chart rises into place, and cards fade in.',
    ],
  },
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
