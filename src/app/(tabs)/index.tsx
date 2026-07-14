import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { usePackProgress } from '@/api/queries';
import { AppText } from '@/components/AppText';
import { BookCard } from '@/components/BookCard';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing, type } from '@/lib/theme/tokens';
import { BOOKS_META } from '@/types/models';

export default function LibraryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const progressQuery = usePackProgress();

  const bookProgress = (book: number): number => {
    const rows = (progressQuery.data ?? []).filter((row) => row.book === book);
    const total = rows.reduce((sum, row) => sum + (row.word_count ?? 0), 0);
    const mastered = rows.reduce((sum, row) => sum + (row.mastered ?? 0), 0);
    return total > 0 ? mastered / total : 0;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.margin,
          paddingBottom: 110,
          gap: spacing.gutter,
        }}>
        <View style={{ gap: 4, marginTop: spacing.sm, marginBottom: spacing.sm }}>
          <AppText style={[type.headlineLg, { color: colors.onSurface }]}>Your Library</AppText>
          <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
            Select a book to continue your vocabulary journey.
          </AppText>
        </View>

        {progressQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : (
          BOOKS_META.map((meta) => (
            <BookCard
              key={meta.book}
              meta={meta}
              progress={bookProgress(meta.book)}
              onPress={() => router.push(`/book/${meta.book}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
