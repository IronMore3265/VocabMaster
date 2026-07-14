import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { radii, type } from '@/lib/theme/tokens';

export type OptionState = 'default' | 'correct' | 'wrong' | 'dimmed';

interface Props {
  label: string;
  state: OptionState;
  disabled?: boolean;
  onPress: () => void;
}

/** Quiz answer row: ghost border by default, emerald/red fill after reveal. */
export function OptionButton({ label, state, disabled, onPress }: Props) {
  const { colors } = useTheme();

  const palette = {
    default: {
      background: colors.surface,
      border: colors.outlineVariant,
      text: colors.onSurface,
      icon: null as string | null,
    },
    correct: {
      background: colors.secondaryFixed,
      border: colors.secondary,
      text: colors.onSurface,
      icon: 'check_circle',
    },
    wrong: {
      background: colors.errorContainer,
      border: colors.error,
      text: colors.onErrorContainer,
      icon: 'cancel',
    },
    dimmed: {
      background: colors.surface,
      border: colors.outlineVariant,
      text: colors.onSurfaceVariant,
      icon: null,
    },
  }[state];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderWidth: 1.5,
        borderColor: palette.border,
        backgroundColor: palette.background,
        borderRadius: radii.md,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        opacity: state === 'dimmed' ? 0.55 : 1,
      }}>
      <View style={{ flex: 1 }}>
        <AppText style={[type.bodyMd, { color: palette.text }]}>{label}</AppText>
      </View>
      {palette.icon ? (
        <MaterialSymbol
          name={palette.icon}
          size={20}
          color={state === 'correct' ? colors.secondary : colors.error}
        />
      ) : null}
    </Pressable>
  );
}
