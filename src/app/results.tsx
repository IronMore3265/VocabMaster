import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { radii, spacing, type } from '@/lib/theme/tokens';

// P1 stub — full session results (score ring, wrong-word review) arrive in P4.
export default function ResultsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: spacing.margin,
      }}>
      <AppText style={[type.headlineMd, { color: colors.onSurface }]}>Session complete</AppText>
      <Pressable
        onPress={() => router.back()}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radii.pill,
          paddingHorizontal: 28,
          paddingVertical: 14,
        }}>
        <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
          Done
        </AppText>
      </Pressable>
    </View>
  );
}
