import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { usePackWords, usePacks, useRecordAttempt } from '@/api/queries';
import { AppText } from '@/components/AppText';
import { FlipCard } from '@/components/FlipCard';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { ProgressBar } from '@/components/ProgressBar';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';

export default function FlashcardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const id = Number(packId);

  const packsQuery = usePacks();
  const wordsQuery = usePackWords(id);
  const recordAttempt = useRecordAttempt();

  const pack = (packsQuery.data ?? []).find((p) => p.id === id);
  const words = wordsQuery.data ?? [];

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  if (wordsQuery.isLoading || !pack) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TopBar back />
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const word = words[index];
  if (!word) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TopBar back />
        <AppText style={{ textAlign: 'center', marginTop: spacing.lg }}>
          No words in this pack.
        </AppText>
      </View>
    );
  }

  const advance = (gotIt: boolean) => {
    Haptics.impactAsync(
      gotIt ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    recordAttempt.mutate({
      wordId: word.id,
      packId: id,
      type: 'flashcard',
      correct: gotIt,
    });
    const newCorrect = correctCount + (gotIt ? 1 : 0);
    if (index === words.length - 1) {
      router.replace(`/results?correct=${newCorrect}&total=${words.length}&packId=${id}`);
      return;
    }
    setCorrectCount(newCorrect);
    setFlipped(false);
    setIndex(index + 1);
  };

  const go = (delta: number) => {
    setFlipped(false);
    setIndex((i) => Math.min(words.length - 1, Math.max(0, i + delta)));
  };

  const roundButton = {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...cardShadow,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back />
      <View style={{ flex: 1, paddingHorizontal: spacing.margin, gap: spacing.gutter }}>
        {/* Progress header */}
        <View style={{ gap: 8, marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>
              PACK {pack.pack_number}: {pack.first_word.toUpperCase()} –{' '}
              {pack.last_word.toUpperCase()}
            </AppText>
            <AppText style={[type.labelMd, { color: colors.primary }]}>
              {index + 1} / {words.length}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <ProgressBar progress={(index + 1) / words.length} />
          </View>
        </View>

        <FlipCard
          word={word}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          onSpeak={() => Speech.speak(word.word, { language: 'en-US' })}
        />

        {/* Controls */}
        <View style={{ marginTop: 'auto', marginBottom: 32, gap: 12 }}>
          {flipped ? (
            <View style={{ flexDirection: 'row', gap: spacing.gutter }}>
              <Pressable
                onPress={() => advance(false)}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: radii.pill,
                  backgroundColor: colors.errorContainer,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                <MaterialSymbol name="replay" size={22} color={colors.onErrorContainer} />
                <AppText
                  style={[type.headlineSm, { fontSize: 16, color: colors.onErrorContainer }]}>
                  Again
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => advance(true)}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: radii.pill,
                  backgroundColor: colors.secondary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                <MaterialSymbol name="check" size={22} color={colors.onSecondary} />
                <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onSecondary }]}>
                  Got it
                </AppText>
              </Pressable>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.gutter,
              }}>
              <Pressable style={roundButton} disabled={index === 0} onPress={() => go(-1)}>
                <MaterialSymbol
                  name="arrow_back"
                  size={24}
                  color={index === 0 ? colors.outlineVariant : colors.onSurface}
                />
              </Pressable>
              <Pressable
                onPress={() => setFlipped(true)}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: radii.pill,
                  backgroundColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                <MaterialSymbol name="flip" size={22} color={colors.onPrimary} />
                <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
                  Flip Card
                </AppText>
              </Pressable>
              <Pressable
                style={roundButton}
                disabled={index === words.length - 1}
                onPress={() => go(1)}>
                <MaterialSymbol
                  name="arrow_forward"
                  size={24}
                  color={index === words.length - 1 ? colors.outlineVariant : colors.onSurface}
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
