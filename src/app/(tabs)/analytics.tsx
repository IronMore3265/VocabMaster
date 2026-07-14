import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { TopBar } from '@/components/TopBar';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { radii, spacing, type } from '@/lib/theme/tokens';

// P2 placeholder — stats, weak words and the AI exercise entry point arrive in P5/P7.
export default function AnalyticsScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: spacing.margin,
        }}>
        <MaterialSymbol name="monitoring" size={48} color={colors.outlineVariant} />
        <AppText style={[type.headlineSm, { color: colors.onSurfaceVariant }]}>
          Analytics coming soon
        </AppText>
        <AppText style={[type.bodySm, { color: colors.outline, textAlign: 'center' }]}>
          Track streaks, accuracy by exercise type and get AI-personalized practice.
        </AppText>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={{
            marginTop: spacing.lg,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            borderRadius: radii.pill,
            paddingHorizontal: 24,
            paddingVertical: 12,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}>
          <MaterialSymbol name="logout" size={18} color={colors.onSurfaceVariant} />
          <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>Sign out</AppText>
        </Pressable>
      </View>
    </View>
  );
}
