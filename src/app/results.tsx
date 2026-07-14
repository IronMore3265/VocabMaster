import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ProgressRing } from '@/components/ProgressRing';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { radii, spacing, type } from '@/lib/theme/tokens';

export default function ResultsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ correct?: string; total?: string }>();
  const correct = Number(params.correct ?? 0);
  const total = Math.max(1, Number(params.total ?? 1));
  const ratio = correct / total;

  const headline =
    ratio >= 0.9 ? 'Excellent!' : ratio >= 0.6 ? 'Well done!' : 'Keep practicing!';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: spacing.margin,
      }}>
      <ProgressRing progress={ratio} size={140} strokeWidth={12} />
      <AppText style={[type.headlineLg, { color: colors.onSurface }]}>{headline}</AppText>
      <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
        You got {correct} of {total} right this session.
      </AppText>
      <Pressable
        onPress={() => router.back()}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radii.pill,
          paddingHorizontal: 32,
          paddingVertical: 14,
          marginTop: spacing.sm,
        }}>
        <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
          Done
        </AppText>
      </Pressable>
    </View>
  );
}
