import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { fonts, radii, spacing, type } from '@/lib/theme/tokens';

export default function SignInScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    setLoading(false);
    // On success the auth listener flips the root gate to (tabs).
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.margin,
          paddingTop: insets.top + 72,
          gap: spacing.gutter,
        }}>
        <View style={{ alignItems: 'center', gap: 10, marginBottom: spacing.lg }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.xl,
              backgroundColor: colors.primaryFixed,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialSymbol name="menu_book" size={36} color={colors.primary} />
          </View>
          <AppText style={[type.headlineLg, { color: colors.onSurface }]}>VocabMaster</AppText>
          <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
            Sign in to continue your vocabulary journey.
          </AppText>
        </View>

        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor={colors.outline}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder="Password"
          placeholderTextColor={colors.outline}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <AppText style={[type.bodySm, { color: colors.error }]}>{error}</AppText>
        ) : null}

        <Pressable
          onPress={signIn}
          disabled={loading || !email || !password}
          style={{
            height: 54,
            borderRadius: radii.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading || !email || !password ? 0.6 : 1,
          }}>
          <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
            {loading ? 'Signing in…' : 'Sign In'}
          </AppText>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
            New here?
          </AppText>
          <Link href="/sign-up">
            <AppText style={[type.bodySm, { color: colors.primary, fontFamily: fonts.bodyMedium }]}>
              Create an account
            </AppText>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
