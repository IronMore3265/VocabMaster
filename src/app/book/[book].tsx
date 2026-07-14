import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PackCard } from '@/components/PackCard';
import { TopBar } from '@/components/TopBar';
import { BOOKS, MOCK_PACKS } from '@/lib/mock';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing, type } from '@/lib/theme/tokens';

export default function WordPacksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { book } = useLocalSearchParams<{ book: string }>();
  const bookNumber = Number(book) === 2 ? 2 : 1;
  const meta = BOOKS.find((b) => b.book === bookNumber)!;

  // P1: mock packs (book 1 shaped); replaced by the packs table in P2.
  const packs = MOCK_PACKS;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar back />
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
            <AppText style={[type.headlineLg, { color: colors.onSurface }]}>{meta.title}</AppText>
            <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
              {meta.subtitle} · {meta.wordCount} words in {meta.packCount} packs
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <PackCard pack={item} onPress={() => router.push(`/pack/${item.id}`)} />
        )}
      />
    </View>
  );
}
