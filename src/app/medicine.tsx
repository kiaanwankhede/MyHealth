import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { DateField, TextField, TimeChips } from '../components/FormFields';
import { deleteMedicine, getMedicine, saveMedicine } from '../db/database';
import { formatDate, startOfLocalDay } from '../lib/dates';
import { validateMedicine } from '../lib/medicines';
import { ensureNotificationPermission, syncReminders } from '../notifications/reminders';
import { colors, radius } from '../theme';

export default function MedicineScreen() {
  const db = useSQLiteContext();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = idParam ? Number(idParam) : null;
  const today = startOfLocalDay(new Date());

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [remind, setRemind] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [stoppedDate, setStoppedDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === null) return;
    getMedicine(db, id).then((m) => {
      if (!m) return;
      setName(m.name);
      setDose(m.dose ?? '');
      setTimes(m.times);
      setRemind(m.remind);
      setStartDate(m.startDate);
      setStoppedDate(m.stoppedDate);
    });
  }, [db, id]);

  const error = validateMedicine({ name, times });

  const save = async (stopped: Date | null) => {
    setSaving(true);
    try {
      if (remind) await ensureNotificationPermission();
      await saveMedicine(db, { id, name, dose, times, remind, startDate, stoppedDate: stopped });
      await syncReminders(db).catch(() => {});
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () =>
    Alert.alert('Delete this medicine?', 'Its history is deleted too. To keep it, use “Stopped taking it”.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMedicine(db, id!);
          await syncReminders(db).catch(() => {});
          router.back();
        },
      },
    ]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: id === null ? 'Add medicine' : 'Edit medicine' }} />
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Rosuvastatin" />
      <TextField
        label="Dose (optional)"
        value={dose}
        onChangeText={setDose}
        placeholder="e.g. 10 mg, 1 tablet"
      />
      <TimeChips label="When you take it" times={times} onChange={setTimes} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Remind me at these times</Text>
        <Switch value={remind} onValueChange={setRemind} trackColor={{ true: colors.teal }} />
      </View>
      <DateField label="Started" value={startDate} onChange={setStartDate} maximumDate={today} />
      {stoppedDate && <Text style={styles.note}>Stopped on {formatDate(stoppedDate)}.</Text>}

      {error && name !== '' && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, (error !== null || saving) && styles.disabled]}
        onPress={() => save(stoppedDate)}
        disabled={error !== null || saving}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      {id !== null && stoppedDate === null && (
        <Pressable
          style={styles.secondary}
          onPress={() => save(today)}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Stopped taking it</Text>
        </Pressable>
      )}
      {id !== null && stoppedDate !== null && (
        <Pressable
          style={styles.secondary}
          onPress={() => save(null)}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Taking it again</Text>
        </Pressable>
      )}
      {id !== null && (
        <Pressable style={styles.delete} onPress={onDelete} accessibilityRole="button">
          <Text style={styles.deleteText}>Delete medicine</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  note: { fontSize: 14, color: colors.muted },
  error: { fontSize: 15, color: colors.orangeDark },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 16, color: colors.ink },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
  secondary: {
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: colors.teal, fontSize: 16, fontWeight: '600' },
  delete: { paddingVertical: 12, alignItems: 'center' },
  deleteText: { fontSize: 16, fontWeight: '600', color: '#A3241B' },
});
