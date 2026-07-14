import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePackWords, usePacks } from '@/api/queries';
import { McqSession } from '@/components/McqSession';
import { TopBar } from '@/components/TopBar';
import { newSeed } from '@/lib/exercises/rng';
import { makeSynAntItems } from '@/lib/exercises/synAnt';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing } from '@/lib/theme/tokens';

export default function SynAntScreen() {
  const { colors } = useTheme();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const id = Number(packId);

  const packsQuery = usePacks();
  const wordsQuery = usePackWords(id);
  const [seed] = useState(newSeed);

  const pack = (packsQuery.data ?? []).find((p) => p.id === id);
  const items = useMemo(
    () => (wordsQuery.data ? makeSynAntItems(wordsQuery.data, seed) : []),
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
          exerciseType="syn_ant"
          headerLabel={`SYNONYM / ANTONYM · PACK ${pack.pack_number}`}
        />
      )}
    </View>
  );
}
