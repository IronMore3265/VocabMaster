import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { usePackWords, usePacks, useRecordAttempt } from '@/api/queries';
import { AppText } from '@/components/AppText';
import { ProgressBar } from '@/components/ProgressBar';
import { TopBar } from '@/components/TopBar';
import { makeMatchingRounds } from '@/lib/exercises/matching';
import { mulberry32, newSeed, shuffle } from '@/lib/exercises/rng';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';

export default function MatchingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const id = Number(packId);

  const packsQuery = usePacks();
  const wordsQuery = usePackWords(id);
  const recordAttempt = useRecordAttempt();
  const [seed] = useState(newSeed);

  const pack = (packsQuery.data ?? []).find((p) => p.id === id);
  const rounds = useMemo(
    () => (wordsQuery.data ? makeMatchingRounds(wordsQuery.data, seed) : []),
    [wordsQuery.data, seed],
  );
  const totalPairs = rounds.reduce((sum, round) => sum + round.pairs.length, 0);

  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [pairsDone, setPairsDone] = useState(0);

  const round = rounds[roundIndex];
  const shuffledMatches = useMemo(
    () => (round ? shuffle(round.pairs, mulberry32(seed + roundIndex + 1)) : []),
    [round, seed, roundIndex],
  );

  if (wordsQuery.isLoading || !pack) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TopBar back />
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }
  if (!round) return null;

  const tapDefinition = (definitionWordId: number) => {
    if (selectedWord === null || matched.has(definitionWordId)) return;

    if (definitionWordId === selectedWord) {
      const firstTry = !missed.has(selectedWord);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      recordAttempt.mutate({
        wordId: selectedWord,
        packId: id,
        type: 'matching',
        correct: firstTry,
      });
      const newMatched = new Set(matched).add(selectedWord);
      const newCorrect = firstTryCorrect + (firstTry ? 1 : 0);
      const newDone = pairsDone + 1;
      setMatched(newMatched);
      setFirstTryCorrect(newCorrect);
      setPairsDone(newDone);
      setSelectedWord(null);

      if (newMatched.size === round.pairs.length) {
        if (roundIndex === rounds.length - 1) {
          router.replace(`/results?correct=${newCorrect}&total=${totalPairs}&packId=${id}`);
          return;
        }
        setTimeout(() => {
          setRoundIndex((r) => r + 1);
          setMatched(new Set());
          setMissed(new Set());
        }, 350);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMissed((m) => new Set(m).add(selectedWord));
      setWrongFlash(definitionWordId);
      setTimeout(() => setWrongFlash(null), 450);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back />
      <View style={{ flex: 1, paddingHorizontal: spacing.margin, gap: spacing.gutter }}>
        {/* Progress header */}
        <View style={{ gap: 8, marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>
              MATCHING · ROUND {roundIndex + 1} / {rounds.length}
            </AppText>
            <AppText style={[type.labelMd, { color: colors.primary }]}>
              {pairsDone} / {totalPairs}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <ProgressBar progress={totalPairs ? pairsDone / totalPairs : 0} />
          </View>
        </View>

        <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
          Tap a word, then tap its meaning.
        </AppText>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Words column */}
            <View style={{ flex: 2, gap: 10 }}>
              {round.pairs.map((pair) => {
                const isMatched = matched.has(pair.wordId);
                const isSelected = selectedWord === pair.wordId;
                return (
                  <Pressable
                    key={pair.wordId}
                    disabled={isMatched}
                    onPress={() => setSelectedWord(isSelected ? null : pair.wordId)}
                    style={{
                      borderWidth: 1.5,
                      borderColor: isMatched
                        ? colors.secondary
                        : isSelected
                          ? colors.primary
                          : colors.outlineVariant,
                      backgroundColor: isMatched
                        ? colors.secondaryFixed
                        : isSelected
                          ? colors.primaryFixed
                          : colors.surface,
                      borderRadius: radii.md,
                      paddingHorizontal: 12,
                      paddingVertical: 14,
                      opacity: isMatched ? 0.55 : 1,
                    }}>
                    <AppText
                      style={[
                        type.bodyMd,
                        {
                          color: isSelected ? colors.onPrimaryFixed : colors.onSurface,
                          fontFamily: 'Inter_500Medium',
                        },
                      ]}>
                      {pair.word}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Definitions column */}
            <View style={{ flex: 3, gap: 10 }}>
              {shuffledMatches.map((pair) => {
                const isMatched = matched.has(pair.wordId);
                const isWrong = wrongFlash === pair.wordId;
                return (
                  <Pressable
                    key={pair.wordId}
                    disabled={isMatched || selectedWord === null}
                    onPress={() => tapDefinition(pair.wordId)}
                    style={[
                      {
                        backgroundColor: isMatched
                          ? colors.secondaryFixed
                          : isWrong
                            ? colors.errorContainer
                            : colors.surface,
                        borderRadius: radii.md,
                        padding: 12,
                        opacity: isMatched ? 0.55 : 1,
                      },
                      cardShadow,
                    ]}>
                    <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
                      {pair.match}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
