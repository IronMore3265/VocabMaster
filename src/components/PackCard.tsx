import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { PressableScale } from '@/components/PressableScale';
import { ProgressBar } from '@/components/ProgressBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';
import type { Pack } from '@/lib/mock';

interface Props {
  pack: Pack;
  onPress: () => void;
}

export function PackCard({ pack, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: 12,
        },
        cardShadow,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.pill,
            backgroundColor: colors.primaryFixed,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialSymbol name="book_2" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={[type.headlineSm, { fontSize: 16, lineHeight: 22 }]}>
            Pack {pack.packNumber}: {pack.firstWord} – {pack.lastWord}
          </AppText>
          <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>
            {pack.wordCount} WORDS
          </AppText>
        </View>
        <MaterialSymbol name="chevron_right" size={24} color={colors.outline} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ProgressBar progress={pack.progress} height={6} />
        <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>
          {Math.round(pack.progress * 100)}%
        </AppText>
      </View>
    </PressableScale>
  );
}
