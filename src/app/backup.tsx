import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { readBackupData, restoreBackupData } from '../db/database';
import { useProfile } from '../db/profile';
import { labReportsCsv, parseBackupJson, toBackupJson } from '../lib/backup';
import { formatDate, toISODate } from '../lib/dates';
import { pickTextFile, shareTextFile } from '../lib/share';
import { colors, radius } from '../theme';

export default function BackupScreen() {
  const db = useSQLiteContext();
  const { reload } = useProfile();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const backUp = () =>
    run(async () => {
      const now = new Date();
      const json = toBackupJson(await readBackupData(db), now);
      await shareTextFile(
        `sehat-backup-${toISODate(now)}.json`,
        json,
        'application/json',
        'Save Sehat backup',
      );
    });

  const exportCsv = () =>
    run(async () => {
      const { labReports } = await readBackupData(db);
      const csv = labReportsCsv(labReports);
      await shareTextFile(`sehat-labs-${toISODate(new Date())}.csv`, csv, 'text/csv', 'Export lab results');
    });

  const restore = () =>
    run(async () => {
      const text = await pickTextFile(['application/json', 'text/plain', 'application/octet-stream']);
      if (text === null) return;
      const data = parseBackupJson(text);
      const confirmed = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Replace your Sehat data?',
          `The backup has ${data.labReports.length} lab reports, ${data.waist.length} waist entries and ` +
            `${data.goals.length} goals. Everything Sehat has saved on this phone is replaced. Steps and weight in ` +
            'Health Connect are not touched.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        ),
      );
      if (!confirmed) return;
      await restoreBackupData(db, data);
      await reload();
      setMessage(`Restored on ${formatDate(new Date())}.`);
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.body}>
        Sehat keeps your goals, lab reports, waist entries and settings only on this phone. Save a backup to
        Google Drive or Files now and then, so a new phone or a reinstall doesn’t lose them.
      </Text>
      <Text style={styles.note}>
        Steps and weight live in Health Connect, which your phone backs up with Google. Android’s own phone
        backup also includes Sehat, but a file you keep yourself is the safest copy.
      </Text>

      <Pressable
        style={[styles.button, busy && styles.disabled]}
        onPress={backUp}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Back up now</Text>
      </Pressable>
      <Pressable
        style={[styles.secondary, busy && styles.disabled]}
        onPress={exportCsv}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Export lab results as a spreadsheet (CSV)</Text>
      </Pressable>
      <Pressable
        style={[styles.secondary, busy && styles.disabled]}
        onPress={restore}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Restore from a backup file</Text>
      </Pressable>

      {message && <Text style={styles.message}>{message}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  note: { fontSize: 14, lineHeight: 20, color: colors.muted },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
  secondary: {
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryText: { color: colors.teal, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.4 },
  message: { fontSize: 15, color: colors.tealDark },
});
