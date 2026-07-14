import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeProvider';
import { type } from '@/lib/theme/tokens';

/** Text defaulting to Inter body-md in the theme's on-surface color. */
export function AppText({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text {...props} style={[type.bodyMd, { color: colors.onSurface }, style]} />;
}
