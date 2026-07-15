import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import {
  clearRecentSearches,
  loadRecentSearches,
  pushRecentSearch,
  useBookmarks,
  useDictionaryLookup,
  useToggleBookmark,
  type DictionaryPayload,
} from '@/api/dictionary';
import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, fonts, radii, spacing, type } from '@/lib/theme/tokens';

function Chip({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.primaryFixed : colors.surfaceContainer,
        borderRadius: radii.pill,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}>
      <AppText
        style={[
          type.bodySm,
          { color: active ? colors.onPrimaryFixed : colors.onSurfaceVariant },
        ]}>
        {label}
      </AppText>
    </Pressable>
  );
}

function AudioButton({ url }: { url: string }) {
  const { colors } = useTheme();
  const player = useAudioPlayer(url);
  return (
    <Pressable
      hitSlop={10}
      onPress={() => {
        player.seekTo(0);
        player.play();
      }}>
      <MaterialSymbol name="volume_up" size={22} color={colors.primary} />
    </Pressable>
  );
}

export default function DictionaryScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [result, setResult] = useState<DictionaryPayload | null>(null);

  const lookup = useDictionaryLookup();
  const bookmarksQuery = useBookmarks();
  const toggleBookmark = useToggleBookmark();

  useEffect(() => {
    loadRecentSearches().then(setRecent);
  }, []);

  const search = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setQuery(trimmed);
    lookup.mutate(trimmed, {
      onSuccess: (payload) => {
        setResult(payload);
        if (payload.entries?.length) {
          pushRecentSearch(trimmed.toLowerCase()).then(setRecent);
        }
      },
    });
  };

  const bookmarkedWords = new Set((bookmarksQuery.data ?? []).map((b) => b.word));
  const currentWord = result?.word ?? '';
  const isBookmarked = bookmarkedWords.has(currentWord);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Dictionary" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.margin,
          paddingBottom: 110,
          gap: spacing.gutter,
        }}>
        {/* Search pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.surface,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            paddingHorizontal: 16,
            marginTop: spacing.sm,
          }}>
          <MaterialSymbol name="search" size={22} color={colors.outline} />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 14,
              fontFamily: fonts.body,
              fontSize: 16,
              color: colors.onSurface,
            }}
            placeholder="Search vocabulary…"
            placeholderTextColor={colors.outline}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => search(query)}
          />
          {query ? (
            <Pressable
              hitSlop={10}
              onPress={() => {
                setQuery('');
                setResult(null);
              }}>
              <MaterialSymbol name="close" size={20} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>

        {/* Recent searches */}
        {recent.length > 0 ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText style={[type.headlineSm, { fontSize: 16 }]}>Recent</AppText>
              <Pressable
                onPress={() => {
                  clearRecentSearches();
                  setRecent([]);
                }}>
                <AppText style={[type.bodySm, { color: colors.primary }]}>Clear</AppText>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {recent.map((word) => (
                <Chip key={word} label={word} active={word === currentWord} onPress={() => search(word)} />
              ))}
            </View>
          </View>
        ) : null}

        {lookup.isPending ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : null}

        {lookup.isError ? (
          <AppText style={[type.bodySm, { color: colors.error }]}>
            Lookup failed. Check your connection and try again.
          </AppText>
        ) : null}

        {/* Did you mean */}
        {result?.suggestions ? (
          <View style={{ gap: 10 }}>
            <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
              No exact match for “{result.word}”. Did you mean:
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {result.suggestions.map((suggestion) => (
                <Chip key={suggestion} label={suggestion} onPress={() => search(suggestion)} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Entries */}
        {result?.entries?.length ? (
          <View
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.cardPadding,
                gap: 16,
              },
              cardShadow,
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={[type.headlineMd, { color: colors.onSurface }]}>
                  {result.word}
                </AppText>
                {result.entries[0].ipa || result.entries[0].pronunciation ? (
                  <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
                    {result.entries[0].ipa ?? `\\${result.entries[0].pronunciation}\\`}
                  </AppText>
                ) : null}
              </View>
              {result.entries[0].audioUrl ? (
                <AudioButton url={result.entries[0].audioUrl} />
              ) : null}
              <Pressable
                hitSlop={10}
                disabled={toggleBookmark.isPending}
                onPress={() =>
                  toggleBookmark.mutate({
                    word: currentWord,
                    payload: result,
                    bookmarked: isBookmarked,
                  })
                }>
                <MaterialSymbol
                  name={isBookmarked ? 'bookmark_added' : 'bookmark_add'}
                  size={24}
                  color={isBookmarked ? colors.secondary : colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            {result.entries.map((entry, index) => (
              <View key={index} style={{ gap: 8 }}>
                {entry.pos ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: colors.primaryFixed,
                      borderRadius: radii.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 3,
                    }}>
                    <AppText style={[type.labelSm, { color: colors.onPrimaryFixed }]}>
                      {entry.pos}
                    </AppText>
                  </View>
                ) : null}
                {entry.definitions.map((definition, defIndex) => (
                  <View key={defIndex} style={{ flexDirection: 'row', gap: 8 }}>
                    <AppText style={[type.bodySm, { color: colors.outline }]}>
                      {defIndex + 1}.
                    </AppText>
                    <AppText style={[type.bodyMd, { color: colors.onSurface, flex: 1 }]}>
                      {definition}
                    </AppText>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Saved words */}
        {!result && (bookmarksQuery.data?.length ?? 0) > 0 ? (
          <View style={{ gap: 10 }}>
            <AppText style={[type.headlineSm, { fontSize: 16 }]}>Saved words</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(bookmarksQuery.data ?? []).map((bookmark) => (
                <Chip key={bookmark.word} label={bookmark.word} onPress={() => search(bookmark.word)} />
              ))}
            </View>
          </View>
        ) : null}

        {!result && !lookup.isPending && recent.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: spacing.lg }}>
            <MaterialSymbol name="dictionary" size={44} color={colors.outlineVariant} />
            <AppText style={[type.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              Look up any English word — Merriam-Webster definitions,{'\n'}pronunciation audio and
              bookmarks.
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
