import { Text, type ColorValue, type StyleProp, type TextStyle } from 'react-native';

import { fonts } from '@/lib/theme/tokens';

interface Props {
  /** Ligature name, e.g. "menu_book", "chevron_right". */
  name: string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders a Material Symbols Outlined glyph via its ligature name using the
 * bundled variable font (assets/fonts/MaterialSymbolsOutlined.ttf).
 */
export function MaterialSymbol({ name, size = 24, color, style }: Props) {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      allowFontScaling={false}
      style={[
        {
          fontFamily: fonts.icons,
          fontSize: size,
          lineHeight: size,
          color,
          includeFontPadding: false,
        },
        style,
      ]}>
      {name}
    </Text>
  );
}
