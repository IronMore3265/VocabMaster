import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ExerciseTile } from '@/components/ExerciseTile';
import { ProgressRing } from '@/components/ProgressRing';
import { TopBar } from '@/components/TopBar';
import { MOCK_PACKS } from '@/lib/mock';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';

export default function PracticeDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const pack = MOCK_PACKS.find((p) => p.id === Number(packId)) ?? MOCK_PACKS[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.margin,
          paddingBottom: 40,
          gap: spacing.gutter,
        }}>
        <View style={{ gap: 4, marginTop: spacing.sm }}>
          <AppText style={[type.headlineLg, { color: colors.onSurface }]}>Practice</AppText>
          <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
            Master your vocabulary pack.
          </AppText>
        </View>

        {/* Overall progress card */}
        <View
          style={[
            {
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.cardPadding,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            cardShadow,
          ]}>
          <View style={{ gap: 6, flex: 1, paddingRight: 12 }}>
            <AppText style={[type.headlineSm, { color: colors.onSurface }]}>
              Overall Progress
            </AppText>
            <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>
              PACK {pack.packNumber}: {pack.firstWord.toUpperCase()} – {pack.lastWord.toUpperCase()}
            </AppText>
          </View>
          <ProgressRing progress={pack.progress} />
        </View>

        {/* Exercise tiles */}
        <View style={{ flexDirection: 'row', gap: spacing.gutter }}>
          <View style={{ flex: 1 }}>
            <ExerciseTile
              kind="flashcards"
              subtitle={`Review ${pack.wordCount} words`}
              onPress={() => router.push(`/practice/${pack.id}/flashcards`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ExerciseTile
              kind="matching"
              onPress={() => router.push(`/practice/${pack.id}/matching`)}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.gutter }}>
          <View style={{ flex: 1 }}>
            <ExerciseTile
              kind="fillBlank"
              onPress={() => router.push(`/practice/${pack.id}/fill-blank`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ExerciseTile
              kind="synAnt"
              onPress={() => router.push(`/practice/${pack.id}/syn-ant`)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
