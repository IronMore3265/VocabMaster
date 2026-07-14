/**
 * Design tokens mapped from the Stitch "Academic Clarity" design system
 * (design/stitch_ielts_academic_lexicon/.../academic_clarity[_dark]/DESIGN.md).
 */

export const lightColors = {
  background: '#f7f9fb',
  surface: '#ffffff', // cards (surface-container-lowest)
  surfaceContainerLow: '#f2f4f6',
  surfaceContainer: '#eceef0',
  surfaceContainerHigh: '#e6e8ea',
  onSurface: '#191c1e',
  onSurfaceVariant: '#464554',
  outline: '#767586',
  outlineVariant: '#c7c4d7',
  primary: '#4648d4',
  onPrimary: '#ffffff',
  primaryFixed: '#e1e0ff',
  primaryFixedDim: '#c0c1ff',
  onPrimaryFixed: '#07006c',
  secondary: '#006c49',
  onSecondary: '#ffffff',
  secondaryFixed: '#6ffbbe',
  secondaryFixedDim: '#4edea3',
  progressTrack: '#e0e3e5',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  /** Ink text used on pastel exercise tiles (both modes per DESIGN.md). */
  ink: '#1e293b',
};

export type ThemeColors = typeof lightColors;

// Dark palette from academic_clarity_dark/DESIGN.md. Deliberate deviation:
// the export's dark primary is a desaturated grey (#c8c6c5); we keep the
// indigo brand by using the light palette's inverse-primary (#c0c1ff).
export const darkColors: ThemeColors = {
  background: '#101415',
  surface: '#1d2022',
  surfaceContainerLow: '#191c1e',
  surfaceContainer: '#272a2c',
  surfaceContainerHigh: '#323537',
  onSurface: '#e0e3e5',
  onSurfaceVariant: '#c4c7c7',
  outline: '#8e9192',
  outlineVariant: '#444748',
  primary: '#c0c1ff',
  onPrimary: '#07006c',
  primaryFixed: '#2f2ebe',
  primaryFixedDim: '#c0c1ff',
  onPrimaryFixed: '#e1e0ff',
  secondary: '#4de082',
  onSecondary: '#003919',
  secondaryFixed: '#6dfe9c',
  secondaryFixedDim: '#4de082',
  progressTrack: '#323537',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  ink: '#1e293b',
};

export type ExerciseKey = 'flashcards' | 'matching' | 'fillBlank' | 'synAnt';
export type ExercisePalette = Record<ExerciseKey, string>;

/** Pastel fills for the four exercise tiles (dark values from practice_dashboard_dark). */
export const exercisePastels: Record<'light' | 'dark', ExercisePalette> = {
  light: {
    flashcards: '#b5e4ca',
    matching: '#fde293',
    fillBlank: '#aecbfa',
    synAnt: '#f6c4ad',
  },
  dark: {
    flashcards: '#1a3828',
    matching: '#382c10',
    fillBlank: '#172740',
    synAnt: '#3d2319',
  },
};

/** In dark mode the pastel hue moves from the tile fill to its text/icon. */
export const exercisePastelText: Record<'light' | 'dark', ExercisePalette> = {
  light: {
    flashcards: lightColors.ink,
    matching: lightColors.ink,
    fillBlank: lightColors.ink,
    synAnt: lightColors.ink,
  },
  dark: {
    flashcards: '#b5e4ca',
    matching: '#fde293',
    fillBlank: '#aecbfa',
    synAnt: '#f6c4ad',
  },
};

export const fonts = {
  headline: 'PlusJakartaSans_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  mono: 'JetBrainsMono_500Medium',
  icons: 'MaterialSymbolsOutlined',
} as const;

export const type = {
  headlineLg: { fontFamily: fonts.headline, fontSize: 24, lineHeight: 32, letterSpacing: -0.5 },
  headlineMd: { fontFamily: fonts.headline, fontSize: 22, lineHeight: 28 },
  headlineSm: { fontFamily: fonts.headline, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  labelMd: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 20, letterSpacing: 0.5 },
  labelSm: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
} as const;

export const radii = { sm: 4, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const spacing = {
  /** Screen edge margin (20px safe zone). */
  margin: 20,
  gutter: 16,
  sm: 8,
  md: 16,
  lg: 32,
  cardPadding: 24,
} as const;

/** "Flat-plus" card shadow: 0 4px 20px rgba(0,0,0,0.04). */
export const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.04,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
