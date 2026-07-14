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
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { fonts, radii, spacing, type } from '@/lib/theme/tokens';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || undefined } },
    });
    if (authError) {
      setError(authError.message);
    } else if (!data.session) {
      // Email confirmation is enabled in Supabase Auth settings.
      setNotice('Check your inbox to confirm your email, then sign in.');
    }
    setLoading(false);
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
        <View style={{ gap: 6, marginBottom: spacing.md }}>
          <AppText style={[type.headlineLg, { color: colors.onSurface }]}>
            Create your account
          </AppText>
          <AppText style={[type.bodyMd, { color: colors.onSurfaceVariant }]}>
            Your progress syncs across devices.
          </AppText>
        </View>

        <TextInput
          style={inputStyle}
          placeholder="Display name"
          placeholderTextColor={colors.outline}
          value={displayName}
          onChangeText={setDisplayName}
        />
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
          placeholder="Password (min 6 characters)"
          placeholderTextColor={colors.outline}
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <AppText style={[type.bodySm, { color: colors.error }]}>{error}</AppText>
        ) : null}
        {notice ? (
          <AppText style={[type.bodySm, { color: colors.secondary }]}>{notice}</AppText>
        ) : null}

        <Pressable
          onPress={signUp}
          disabled={loading || !email || password.length < 6}
          style={{
            height: 54,
            borderRadius: radii.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading || !email || password.length < 6 ? 0.6 : 1,
          }}>
          <AppText style={[type.headlineSm, { fontSize: 16, color: colors.onPrimary }]}>
            {loading ? 'Creating…' : 'Create Account'}
          </AppText>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <AppText style={[type.bodySm, { color: colors.onSurfaceVariant }]}>
            Already have an account?
          </AppText>
          <Link href="/sign-in">
            <AppText style={[type.bodySm, { color: colors.primary, fontFamily: fonts.bodyMedium }]}>
              Sign in
            </AppText>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
