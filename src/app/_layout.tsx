import type { ErrorBoundaryProps } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { DATABASE_NAME, migrate } from '../db/database';
import { ProfileProvider } from '../db/profile';
import { colors, radius } from '../theme';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      <ProfileProvider>
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
          <Stack.Screen name="log-waist" options={{ title: 'Log waist', presentation: 'modal' }} />
          <Stack.Screen name="profile" options={{ title: 'Your details', presentation: 'modal' }} />
          <Stack.Screen name="backup" options={{ title: 'Backup and export', presentation: 'modal' }} />
          <Stack.Screen name="medicines" options={{ title: 'Medicines' }} />
          <Stack.Screen name="medicine" options={{ title: 'Medicine', presentation: 'modal' }} />
          <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
          <Stack.Screen name="summary" options={{ title: 'Doctor summary', presentation: 'modal' }} />
          <Stack.Screen name="import-report" options={{ title: 'Import lab report', presentation: 'modal' }} />
        </Stack>
      </ProfileProvider>
    </SQLiteProvider>
  );
}

/** Shown instead of closing the app when something fails, so the message can be reported. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sehat hit a problem</Text>
      <Text style={styles.body}>Take a screenshot of this screen and share it, then tap Try again.</Text>
      <Text style={styles.error} selectable>
        {error.name}: {error.message}
        {'\n\n'}
        {error.stack?.split('\n').slice(0, 8).join('\n')}
      </Text>
      <Pressable style={styles.button} onPress={retry} accessibilityRole="button">
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, paddingTop: 64, gap: 14 },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, lineHeight: 22, color: colors.muted },
  error: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: colors.orangeDark,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
  },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
});
