import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootStack() {
  const { colors, isDark } = useTheme();
  const { session, initializing } = useAuth();

  if (initializing) {
    return null; // splash stays visible until the persisted session is restored
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="results" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)/sign-in" />
          <Stack.Screen name="(auth)/sign-up" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
