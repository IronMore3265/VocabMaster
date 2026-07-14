import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePackWords, usePacks } from '@/api/queries';
import { McqSession } from '@/components/McqSession';
import { TopBar } from '@/components/TopBar';
import { makeFillBlankItems } from '@/lib/exercises/fillBlank';
import { newSeed } from '@/lib/exercises/rng';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing } from '@/lib/theme/tokens';

export default function FillBlankScreen() {
  const { colors } = useTheme();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const id = Number(packId);

  const packsQuery = usePacks();
  const wordsQuery = usePackWords(id);
  const [seed] = useState(newSeed);

  const pack = (packsQuery.data ?? []).find((p) => p.id === id);
  const items = useMemo(
    () => (wordsQuery.data ? makeFillBlankItems(wordsQuery.data, seed) : []),
    [wordsQuery.data, seed],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back />
      {wordsQuery.isLoading || !pack ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <McqSession
          items={items}
          packId={id}
          exerciseType="fill_blank"
          headerLabel={`FILL IN THE BLANKS · PACK ${pack.pack_number}`}
        />
      )}
    </View>
  );
}
