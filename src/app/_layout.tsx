import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '../theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
  );
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.teal,
          tabBarInactiveTintColor: colors.inactive,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('home-variant') }} />
        <Tabs.Screen name="steps" options={{ title: 'Steps', tabBarIcon: tabIcon('walk') }} />
        <Tabs.Screen name="weight" options={{ title: 'Weight', tabBarIcon: tabIcon('scale-bathroom') }} />
        <Tabs.Screen name="labs" options={{ title: 'Labs', tabBarIcon: tabIcon('test-tube') }} />
      </Tabs>
    </>
  );
}
