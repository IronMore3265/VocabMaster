import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing, type } from '@/lib/theme/tokens';

// P1 placeholder — real search UI + dictionary-lookup edge function arrive in P6.
export default function DictionaryScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: spacing.margin }}>
        <MaterialSymbol name="dictionary" size={48} color={colors.outlineVariant} />
        <AppText style={[type.headlineSm, { color: colors.onSurfaceVariant }]}>
          Dictionary coming soon
        </AppText>
        <AppText style={[type.bodySm, { color: colors.outline, textAlign: 'center' }]}>
          Search any English word with Merriam-Webster definitions, audio and bookmarks.
        </AppText>
      </View>
    </View>
  );
}
