import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { mcqItems, useCompleteSuggestion, useSuggestExercise } from '@/api/ai';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { McqSession } from '@/components/McqSession';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';

export default function AiPracticeScreen() {
  const { colors } = useTheme();
  const suggest = useSuggestExercise();
  const complete = useCompleteSuggestion();
  const [started, setStarted] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (!requested.current) {
      requested.current = true;
      suggest.mutate({});
    }
  }, [suggest]);

  const response = suggest.data;
  const payload = response?.payload;
  const items = payload ? mcqItems(payload) : [];

  const primaryButton = {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back title="AI Coach" />

      {started && payload && response?.suggestionId ? (
        <McqSession
          items={items}
          packId={items[0]?.packId ?? 0}
          exerciseType="ai_mixed"
          headerLabel="AI SESSION"
          onFinished={(correct, total) =>
            complete.mutate({ suggestionId: response.suggestionId!, score: correct / total })
          }
        />
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.margin, gap: spacing.gutter }}>
          {suggest.isPending ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <Icon name="auto_awesome" size={44} color={colors.primary} />
              <ActivityIndicator color={colors.primary} />
              <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                Analyzing your mistakes and building{'\n'}a personalized session…
              </AppText>
            </View>
          ) : null}

          {suggest.isError ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <Icon name="error" size={40} color={colors.error} />
              <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                Could not reach the AI coach. Try again in a moment.
              </AppText>
              <Pressable
                onPress={() => suggest.mutate({})}
                style={[primaryButton, { paddingHorizontal: 28 }]}>
                <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
                  Retry
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {response?.error === 'not_enough_data' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <Icon name="school" size={44} color={colors.outlineVariant} />
              <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                {response.message ?? 'Practice more first so the AI can find your weak spots.'}
              </AppText>
            </View>
          ) : null}

          {response?.error && response.error !== 'not_enough_data' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <Icon name="error" size={40} color={colors.error} />
              <AppText style={[type.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                The AI coach hit a snag: {response.error}
              </AppText>
              <Pressable
                onPress={() => suggest.mutate({ force: true })}
                style={[primaryButton, { paddingHorizontal: 28 }]}>
                <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
                  Try again
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {payload && !started ? (
            <>
              <View
                style={[
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.xl,
                    padding: spacing.cardPadding,
                    gap: 12,
                    marginTop: spacing.gutter,
                  },
                  cardShadow,
                ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="auto_awesome" size={24} color={colors.primary} />
                  <AppText style={[type.headlineSm, { color: colors.onSurface }]}>
                    Your focus today
                  </AppText>
                </View>
                <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
                  {payload.focusSummary}
                </AppText>
                <AppText style={[type.labelSm, { color: colors.outline }]}>
                  {items.length} QUESTIONS · MIXED
                  {response?.cached ? ' · FROM TODAY’S PLAN' : ''}
                </AppText>
              </View>

              <Pressable onPress={() => setStarted(true)} style={primaryButton}>
                <Icon name="play_arrow" size={22} color={colors.onPrimary} />
                <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
                  Start Session
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => suggest.mutate({ force: true })}
                disabled={suggest.isPending}
                style={{ alignSelf: 'center', paddingVertical: 8 }}>
                <AppText style={[type.bodySm, { color: colors.primary }]}>
                  Generate a fresh session instead
                </AppText>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}
