import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { spacing, type } from '@/lib/theme/tokens';

interface Props {
  title?: string;
  /** Show a back arrow instead of the menu glyph. */
  back?: boolean;
}

/** Stitch top app bar: leading menu/back icon, title, trailing notifications bell. */
export function TopBar({ title = 'IELTS Master', back = false }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: spacing.margin,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {back ? (
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <MaterialSymbol name="arrow_back" size={24} color={colors.onSurface} />
          </Pressable>
        ) : (
          <MaterialSymbol name="menu" size={24} color={colors.primary} />
        )}
        <AppText style={[type.headlineMd, { color: colors.onSurface }]}>{title}</AppText>
      </View>
      <MaterialSymbol name="notifications" size={24} color={colors.onSurfaceVariant} />
    </View>
  );
}
