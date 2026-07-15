import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cardShadow, fonts, radii, type } from '@/lib/theme/tokens';

interface Props {
  icon: string;
  value: string;
  label: string;
}

/** Compact stat card for the analytics header grid. */
export function StatTile({ icon, value, label }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: 16,
          gap: 6,
        },
        cardShadow,
      ]}>
      <MaterialSymbol name={icon} size={22} color={colors.primary} />
      <AppText style={{ fontFamily: fonts.mono, fontSize: 22, lineHeight: 28, color: colors.onSurface }}>
        {value}
      </AppText>
      <AppText style={[type.labelSm, { color: colors.onSurfaceVariant }]}>{label}</AppText>
    </View>
  );
}
