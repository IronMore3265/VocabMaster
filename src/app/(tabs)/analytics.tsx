import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import {
  computeStreak,
  useAttemptDates,
  useExerciseAccuracy,
  usePackProgress,
  useWeakWords,
} from '@/api/queries';
import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { PressableScale } from '@/components/PressableScale';
import { ProgressBar } from '@/components/ProgressBar';
import { StatTile } from '@/components/StatTile';
import { TopBar } from '@/components/TopBar';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';
import type { ExerciseType } from '@/types/models';

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  flashcard: 'Flashcards',
  matching: 'Matching',
  fill_blank: 'Fill-in-the-blanks',
  syn_ant: 'Synonym/Antonym',
  ai_mixed: 'AI Sessions',
};

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const accuracyQuery = useExerciseAccuracy();
  const weakWordsQuery = useWeakWords(10);
  const datesQuery = useAttemptDates();
  const packProgressQuery = usePackProgress();

  const accuracy = accuracyQuery.data ?? [];
  const weakWords = weakWordsQuery.data ?? [];
  const streak = computeStreak(datesQuery.data ?? []);
  const totalAttempts = accuracy.reduce((sum, row) => sum + (row.attempts ?? 0), 0);
  const overallAccuracy =
    totalAttempts > 0
      ? accuracy.reduce((sum, row) => sum + (row.accuracy ?? 0) * (row.attempts ?? 0), 0) /
        totalAttempts
      : 0;
  const mastered = (packProgressQuery.data ?? []).reduce(
    (sum, row) => sum + (row.mastered ?? 0),
    0,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.margin,
          paddingBottom: 110,
          gap: spacing.gutter,
        }}>
        <View style={{ gap: 4, marginTop: spacing.sm }}>
          <AppText style={[type.headlineLg, { color: colors.onSurface }]}>Progress</AppText>
          <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
            Your learning at a glance.
          </AppText>
        </View>

        {/* Stat grid */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatTile icon="local_fire_department" value={String(streak)} label="DAY STREAK" />
          <StatTile icon="workspace_premium" value={String(mastered)} label="MASTERED" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatTile icon="history" value={String(totalAttempts)} label="ATTEMPTS" />
          <StatTile
            icon="target"
            value={`${Math.round(overallAccuracy * 100)}%`}
            label="ACCURACY"
          />
        </View>

        {/* AI coach card */}
        <PressableScale
          onPress={() => router.push('/practice/ai')}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.xl,
            padding: spacing.cardPadding,
            gap: 8,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialSymbol name="auto_awesome" size={26} color={colors.onPrimary} />
            <AppText style={[type.headlineSm, { color: colors.onPrimary }]}>AI Coach</AppText>
          </View>
          <AppText style={[type.bodySm, { color: colors.onPrimary, opacity: 0.85 }]}>
            Generate a personalized session from the words you keep missing.
          </AppText>
        </PressableScale>

        {/* Accuracy by exercise */}
        {accuracy.length > 0 ? (
          <View
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.cardPadding,
                gap: 14,
              },
              cardShadow,
            ]}>
            <AppText style={[type.headlineSm, { color: colors.onSurface }]}>
              Accuracy by exercise
            </AppText>
            {accuracy.map((row) => (
              <View key={row.exercise_type} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
                    {row.exercise_type ? EXERCISE_LABELS[row.exercise_type] : '—'}
                  </AppText>
                  <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>
                    {Math.round((row.accuracy ?? 0) * 100)}% · {row.attempts}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <ProgressBar progress={row.accuracy ?? 0} height={6} />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Weak words */}
        {weakWords.length > 0 ? (
          <View
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.cardPadding,
                gap: 4,
              },
              cardShadow,
            ]}>
            <AppText style={[type.headlineSm, { color: colors.onSurface, marginBottom: 8 }]}>
              Words to review
            </AppText>
            {weakWords.map((weak) => (
              <Pressable
                key={weak.id}
                onPress={() => weak.pack_id && router.push(`/pack/${weak.pack_id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.progressTrack,
                }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText style={[type.bodyMd, { color: colors.onSurface }]}>
                    {weak.word}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
                    {weak.definition}
                  </AppText>
                </View>
                <View
                  style={{
                    backgroundColor: colors.errorContainer,
                    borderRadius: radii.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}>
                  <AppText style={[type.labelSm, { color: colors.onErrorContainer }]}>
                    ×{weak.wrong_count}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            style={{
              alignItems: 'center',
              gap: 8,
              paddingVertical: spacing.lg,
            }}>
            <MaterialSymbol name="sentiment_satisfied" size={36} color={colors.outlineVariant} />
            <AppText style={[type.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              No weak words yet — miss a word twice and it shows up here.
            </AppText>
          </View>
        )}

        {/* Sign out */}
        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={{
            alignSelf: 'center',
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            borderRadius: radii.pill,
            paddingHorizontal: 24,
            paddingVertical: 12,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}>
          <MaterialSymbol name="logout" size={18} color={colors.onSurfaceVariant} />
          <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>Sign out</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}
