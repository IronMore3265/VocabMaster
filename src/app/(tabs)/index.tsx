import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BookCard } from '@/components/BookCard';
import { TopBar } from '@/components/TopBar';
import { BOOKS } from '@/lib/mock';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing, type } from '@/lib/theme/tokens';

export default function LibraryScreen() {
  const { colors } = useTheme();
  const router = useRouter();

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

        {BOOKS.map((book) => (
          <BookCard key={book.book} book={book} onPress={() => router.push(`/book/${book.book}`)} />
        ))}
      </ScrollView>
    </View>
  );
}
