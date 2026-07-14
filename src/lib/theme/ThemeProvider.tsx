import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkColors,
  exercisePastels,
  exercisePastelText,
  lightColors,
  type ExercisePalette,
  type ThemeColors,
} from './tokens';

export interface Theme {
  colors: ThemeColors;
  pastels: ExercisePalette;
  pastelText: ExercisePalette;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({
  colors: lightColors,
  pastels: exercisePastels.light,
  pastelText: exercisePastelText.light,
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      pastels: isDark ? exercisePastels.dark : exercisePastels.light,
      pastelText: isDark ? exercisePastelText.dark : exercisePastelText.light,
      isDark,
    }),
    [isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
