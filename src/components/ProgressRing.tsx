import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { type } from '@/lib/theme/tokens';

interface Props {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
}

/** Circular progress indicator with a centered mono percentage. */
export function ProgressRing({ progress, size = 96, strokeWidth = 10 }: Props) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.progressTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.secondaryFixedDim}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </Svg>
      <AppText
        style={[type.labelMd, { position: 'absolute', color: colors.onSurface, fontSize: 18 }]}>
        {Math.round(clamped * 100)}%
      </AppText>
    </View>
  );
}
