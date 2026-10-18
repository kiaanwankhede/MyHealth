import { Stack } from 'expo-router/stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrate } from '../db/database';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="goal" options={{ title: 'Set your goal', presentation: 'modal' }} />
        <Stack.Screen name="log-weight" options={{ title: 'Log weight', presentation: 'modal' }} />
        <Stack.Screen name="lab-report" options={{ title: 'Lab report', presentation: 'modal' }} />
      </Stack>
    </SQLiteProvider>
  );
}
