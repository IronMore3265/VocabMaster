import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useRecordAttempt } from '@/api/queries';
import { AppText } from '@/components/AppText';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { ProgressBar } from '@/components/ProgressBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';
import type { McqItem } from '@/types/exercise';
import type { ExerciseType } from '@/types/models';

interface Props {
  items: McqItem[];
  packId: number;
  exerciseType: ExerciseType;
  headerLabel: string;
}

/**
 * Shared MCQ player for fill-blank, syn-ant and AI definition questions:
 * question card + options, answer reveal with haptics, record_attempt per
 * answer, results modal at the end.
 */
export function McqSession({ items, packId, exerciseType, headerLabel }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const recordAttempt = useRecordAttempt();

  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const item = items[index];
  if (!item) return null;

  const answered = selectedId !== null;
  const wasCorrect = selectedId === item.correctOptionId;

  const select = (optionId: string) => {
    if (answered) return;
    const correct = optionId === item.correctOptionId;
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    setSelectedId(optionId);
    setCorrectCount((count) => count + (correct ? 1 : 0));
    recordAttempt.mutate({
      wordId: item.wordId,
      packId,
      type: exerciseType,
      correct,
    });
  };

  const next = () => {
    if (index === items.length - 1) {
      const finalCorrect = correctCount;
      router.replace(`/results?correct=${finalCorrect}&total=${items.length}&packId=${packId}`);
      return;
    }
    setSelectedId(null);
    setIndex(index + 1);
  };

  const optionState = (optionId: string): OptionState => {
    if (!answered) return 'default';
    if (optionId === item.correctOptionId) return 'correct';
    if (optionId === selectedId) return 'wrong';
    return 'dimmed';
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.margin }}>
      {/* Progress header */}
      <View style={{ gap: 8, marginTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>
            {headerLabel}
          </AppText>
          <AppText style={[type.labelMd, { color: colors.primary }]}>
            {index + 1} / {items.length}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <ProgressBar progress={(index + 1) / items.length} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.gutter, paddingVertical: spacing.gutter }}>
        {/* Question card */}
        <View
          style={[
            {
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.cardPadding,
              minHeight: 120,
              justifyContent: 'center',
            },
            cardShadow,
          ]}>
          <AppText style={[type.bodyLg, { color: colors.onSurface }]}>{item.prompt}</AppText>
        </View>

        <View style={{ gap: 10 }}>
          {item.options.map((option) => (
            <OptionButton
              key={option.id}
              label={option.text}
              state={optionState(option.id)}
              disabled={answered}
              onPress={() => select(option.id)}
            />
          ))}
        </View>

        {answered && item.explanation ? (
          <View
            style={{
              backgroundColor: colors.surfaceContainerLow,
              borderRadius: radii.md,
              padding: 14,
              borderLeftWidth: 3,
              borderLeftColor: wasCorrect ? colors.secondaryFixedDim : colors.error,
            }}>
            <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
              {item.word}: {item.explanation}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      {answered ? (
        <Pressable
          onPress={next}
          style={{
            height: 56,
            borderRadius: radii.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}>
          <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
            {index === items.length - 1 ? 'Finish' : 'Next'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
