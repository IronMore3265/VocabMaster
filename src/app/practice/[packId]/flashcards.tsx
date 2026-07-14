import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FlipCard } from '@/components/FlipCard';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { ProgressBar } from '@/components/ProgressBar';
import { TopBar } from '@/components/TopBar';
import { MOCK_PACKS, MOCK_WORDS } from '@/lib/mock';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';

export default function FlashcardsScreen() {
  const { colors } = useTheme();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const pack = MOCK_PACKS.find((p) => p.id === Number(packId)) ?? MOCK_PACKS[0];

  // P1: mock words; P2 loads the pack's real words from Supabase.
  const words = MOCK_WORDS;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const word = words[index];

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
              PACK {pack.packNumber}: {pack.firstWord.toUpperCase()} –{' '}
              {pack.lastWord.toUpperCase()}
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.gutter,
            marginTop: 'auto',
            marginBottom: 32,
          }}>
          <Pressable style={roundButton} disabled={index === 0} onPress={() => go(-1)}>
            <MaterialSymbol
              name="arrow_back"
              size={24}
              color={index === 0 ? colors.outlineVariant : colors.onSurface}
            />
          </Pressable>
          <Pressable
            onPress={() => setFlipped((f) => !f)}
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
      </View>
    </View>
  );
}
