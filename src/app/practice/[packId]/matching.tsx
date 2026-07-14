import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing, type } from '@/lib/theme/tokens';

// P1 stub — the matching exercise is built in P4.
export default function MatchingScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.margin }}>
        <AppText style={[type.headlineSm, { color: colors.onSurfaceVariant }]}>
          Matching — coming in P4
        </AppText>
      </View>
    </View>
  );
}
