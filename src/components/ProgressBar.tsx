import { View } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeProvider';
import { radii } from '@/lib/theme/tokens';

interface Props {
  /** 0..1 */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
}

/** Pill-shaped linear progress bar (emerald fill on neutral track). */
export function ProgressBar({ progress, height = 8, color, trackColor }: Props) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{
        height,
        borderRadius: radii.pill,
        backgroundColor: trackColor ?? colors.progressTrack,
        overflow: 'hidden',
        flex: 1,
      }}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radii.pill,
          backgroundColor: color ?? colors.secondaryFixedDim,
        }}
      />
    </View>
  );
}
