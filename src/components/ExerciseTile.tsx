import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { radii, type, type ExerciseKey } from '@/lib/theme/tokens';

const TILE_META: Record<ExerciseKey, { title: string; subtitle: string; icon: string }> = {
  flashcards: { title: 'Flashcards', subtitle: 'Review words', icon: 'style' },
  matching: { title: 'Matching', subtitle: 'Pair words & meanings', icon: 'join_inner' },
  fillBlank: { title: 'Fill-in-the-blanks', subtitle: 'Contextual practice', icon: 'edit_note' },
  synAnt: { title: 'Synonym/Antonym', subtitle: 'Expand vocabulary', icon: 'compare_arrows' },
};

interface Props {
  kind: ExerciseKey;
  onPress: () => void;
  subtitle?: string;
}

/** Pastel exercise tile from the practice dashboard mockup. */
export function ExerciseTile({ kind, onPress, subtitle }: Props) {
  const { pastels, pastelText, isDark, colors } = useTheme();
  const meta = TILE_META[kind];
  const textColor = pastelText[kind];

  return (
    <PressableScale
      onPress={onPress}
      style={{
        backgroundColor: pastels[kind],
        borderRadius: radii.xl,
        minHeight: 150,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.outlineVariant,
      }}>
      <MaterialSymbol name={meta.icon} size={32} color={textColor} />
      <AppText style={[type.headlineSm, { fontSize: 16, color: textColor, textAlign: 'center' }]}>
        {meta.title}
      </AppText>
      <AppText style={[type.bodySm, { color: textColor, opacity: 0.75, textAlign: 'center' }]}>
        {subtitle ?? meta.subtitle}
      </AppText>
    </PressableScale>
  );
}
