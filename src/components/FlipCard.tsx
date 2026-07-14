import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, radii, spacing, type } from '@/lib/theme/tokens';
import { POS_LABELS, type WordRow } from '@/types/models';

interface Props {
  word: WordRow;
  flipped: boolean;
  onFlip: () => void;
  onSpeak?: () => void;
}

/** Large flip card: word/phonetic front, definition/example back (Reanimated rotateY). */
export function FlipCard({ word, flipped, onFlip, onSpeak }: Props) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(flipped ? 180 : 0, { duration: 400 });
  }, [flipped, rotation]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
    opacity: interpolate(rotation.value, [89, 90], [1, 0], 'clamp'),
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value - 180}deg` }],
    opacity: interpolate(rotation.value, [90, 91], [0, 1], 'clamp'),
  }));

  const face = {
    position: 'absolute' as const,
    width: '100%' as const,
    height: '100%' as const,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardPadding,
    backfaceVisibility: 'hidden' as const,
  };

  const example = word.example_sentences?.[0];

  return (
    <View style={{ height: 380 }}>
      {/* Decorative deck stack behind the card */}
      <View
        style={{
          position: 'absolute',
          top: 14,
          left: 18,
          right: 18,
          height: '100%',
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          opacity: 0.45,
          transform: [{ rotate: '2deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 7,
          left: 9,
          right: 9,
          height: '100%',
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          opacity: 0.7,
          transform: [{ rotate: '-1.2deg' }],
        }}
      />

      <Pressable style={{ flex: 1 }} onPress={onFlip}>
        {/* Front */}
        <Animated.View style={[face, cardShadow, frontStyle]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Pressable hitSlop={12} onPress={onSpeak}>
              <MaterialSymbol name="volume_up" size={26} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <AppText style={[type.headlineLg, { fontSize: 34, lineHeight: 42, color: colors.primary }]}>
              {word.word}
            </AppText>
            {word.pronunciation ? (
              <AppText style={[type.bodyLg, { color: colors.onSurfaceVariant }]}>
                {word.pronunciation}
              </AppText>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            <MaterialSymbol name="touch_app" size={18} color={colors.outline} />
            <AppText style={[type.labelSm, { color: colors.outline }]}>TAP TO FLIP</AppText>
          </View>
        </Animated.View>

        {/* Back */}
        <Animated.View style={[face, cardShadow, backStyle]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.primaryFixed,
                borderRadius: radii.pill,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}>
              <AppText style={[type.labelSm, { color: colors.onPrimaryFixed }]}>
                {(word.part_of_speech && POS_LABELS[word.part_of_speech]) ??
                  word.part_of_speech ??
                  ''}
              </AppText>
            </View>
            <AppText style={[type.bodyLg, { color: colors.onSurface }]}>{word.definition}</AppText>
            {example ? (
              <View
                style={{
                  backgroundColor: colors.surfaceContainerLow,
                  borderRadius: radii.md,
                  padding: 14,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.secondaryFixedDim,
                }}>
                <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant, fontStyle: 'italic' }]}>
                  {example}
                </AppText>
              </View>
            ) : null}
            {word.notes ? (
              <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
                {word.notes}
              </AppText>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </View>
  );
}
