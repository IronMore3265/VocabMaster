import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, View, type ColorValue } from 'react-native';

import { MaterialSymbol } from '@/components/MaterialSymbol';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { fonts } from '@/lib/theme/tokens';

function TabIcon({ name, color, focused }: { name: string; color: ColorValue; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <MaterialSymbol name={name} size={24} color={color} />
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: focused ? color : 'transparent',
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0.5,
          borderTopColor: colors.progressTrack,
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : isDark ? '#101415f2' : '#f7f9fbf2',
          height: 78,
          paddingTop: 6,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint={isDark ? 'dark' : 'light'}
              style={{ flex: 1 }}
            />
          ) : null,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="local_library" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: 'Dictionary',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="dictionary" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="monitoring" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
