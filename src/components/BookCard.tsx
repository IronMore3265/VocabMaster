import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ProgressBar } from '@/components/ProgressBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';
import type { BookMeta } from '@/types/models';

const GRADIENTS: Record<number, [string, string]> = {
  1: ['#e1e0ff', '#c0c1ff'],
  2: ['#6cf8bb', '#4edea3'],
};

interface Props {
  meta: BookMeta;
  /** 0..1 mastered ratio across the book. */
  progress: number;
  onPress: () => void;
}

export function BookCard({ meta, progress, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          overflow: 'hidden',
        },
        cardShadow,
      ]}>
      <LinearGradient
        colors={GRADIENTS[meta.book] ?? GRADIENTS[1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 148, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="menu_book" size={56} color="#191c1e" />
      </LinearGradient>

      <View style={{ padding: spacing.md, gap: 2 }}>
        <AppText style={[type.headlineSm, { color: colors.onSurface }]}>{meta.title}</AppText>
        <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
          {meta.subtitle}
        </AppText>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.progressTrack,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          gap: 6,
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>PROGRESS</AppText>
          <AppText style={[type.labelSm, { color: colors.secondary }]}>
            {Math.round(progress * 100)}%
          </AppText>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <ProgressBar progress={progress} />
        </View>
      </View>
    </PressableScale>
  );
}
