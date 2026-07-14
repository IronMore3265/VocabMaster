import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { progressRatio, usePackProgress, usePacks } from '@/api/queries';
import { AppText } from '@/components/AppText';
import { PackCard } from '@/components/PackCard';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing, type } from '@/lib/theme/tokens';
import { BOOKS_META } from '@/types/models';

export default function WordPacksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { book } = useLocalSearchParams<{ book: string }>();
  const bookNumber = Number(book) === 2 ? 2 : 1;
  const meta = BOOKS_META.find((b) => b.book === bookNumber)!;

  const packsQuery = usePacks();
  const progressQuery = usePackProgress();

  const packs = (packsQuery.data ?? []).filter((pack) => pack.book === bookNumber);
  const progressByPack = new Map(
    (progressQuery.data ?? []).map((row) => [row.pack_id, row]),
  );
  const totalWords = packs.reduce((sum, pack) => sum + pack.word_count, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back />
      {packsQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={packs}
          keyExtractor={(pack) => String(pack.id)}
          contentContainerStyle={{
            paddingHorizontal: spacing.margin,
            paddingBottom: 40,
            gap: 12,
          }}
          ListHeaderComponent={
            <View style={{ gap: 4, marginTop: spacing.sm, marginBottom: spacing.sm }}>
              <AppText style={[type.headlineLg, { color: colors.onSurface }]}>
                {meta.title}
              </AppText>
              <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
                {meta.subtitle} · {totalWords} words in {packs.length} packs
              </AppText>
            </View>
          }
          renderItem={({ item }) => (
            <PackCard
              pack={item}
              progress={progressRatio(progressByPack.get(item.id))}
              onPress={() => router.push(`/pack/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
