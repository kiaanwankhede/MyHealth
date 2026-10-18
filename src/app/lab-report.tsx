import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { DateField, NumberField, TextField } from '../components/FormFields';
import { deleteLabReport, getLabReport, saveLabReport } from '../db/database';
import { LIPIDS, validateLipid, type LipidKey } from '../lib/cholesterol';
import { startOfLocalDay } from '../lib/dates';
import { parseDecimal } from '../lib/format';
import { colors, radius } from '../theme';

type Values = Record<LipidKey, string>;
const EMPTY: Values = { total: '', ldl: '', hdl: '', triglycerides: '' };

/** Empty text means "not on this report". */
const toNumber = (text: string): number | null => (text.trim() === '' ? null : parseDecimal(text));

export default function LabReportScreen() {
  const db = useSQLiteContext();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = idParam ? Number(idParam) : null;
  const today = startOfLocalDay(new Date());

  const [date, setDate] = useState(today);
  const [lab, setLab] = useState('');
  const [values, setValues] = useState<Values>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    getLabReport(db, id).then((r) => {
      if (!r) return;
      setDate(r.date);
      setLab(r.lab ?? '');
      setValues({
        total: r.total?.toString() ?? '',
        ldl: r.ldl?.toString() ?? '',
        hdl: r.hdl?.toString() ?? '',
        triglycerides: r.triglycerides?.toString() ?? '',
      });
    });
  }, [db, id]);

  const numbers = Object.fromEntries(LIPIDS.map(({ key }) => [key, toNumber(values[key])])) as Record<
    LipidKey,
    number | null
  >;
  const errors = LIPIDS.map(({ key }) => validateLipid(key, numbers[key])).filter(Boolean);
  const hasAny = LIPIDS.some(({ key }) => numbers[key] !== null);
  const canSave = hasAny && errors.length === 0 && !saving;

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveLabReport(db, { id, date, lab: lab.trim() || null, ...numbers });
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the report.');
      setSaving(false);
    }
  };

  const onDelete = () =>
    Alert.alert('Delete this report?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteLabReport(db, id!);
          router.back();
        },
      },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: id === null ? 'Add lab report' : 'Edit lab report' }} />
      <DateField label="Test date" value={date} onChange={setDate} maximumDate={today} />
      <TextField label="Lab (optional)" value={lab} onChangeText={setLab} placeholder="e.g. City Lab" />
      {LIPIDS.map(({ key, name }) => (
        <NumberField
          key={key}
          label={key === 'total' ? 'Total cholesterol' : name}
          value={values[key]}
          onChangeText={(text) => setValues((v) => ({ ...v, [key]: text }))}
          unit="mg/dL"
        />
      ))}
      <Text style={styles.note}>Leave a value empty if it isn’t on your report.</Text>

      {errors.map((e) => (
        <Text key={e} style={styles.error}>
          {e}
        </Text>
      ))}

      {saveError && <Text style={styles.error}>{saveError}</Text>}

      <Pressable
        style={[styles.button, !canSave && styles.buttonDisabled]}
        onPress={onSave}
        disabled={!canSave}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save report'}</Text>
      </Pressable>

      {id !== null && (
        <Pressable style={styles.delete} onPress={onDelete} accessibilityRole="button">
          <Text style={styles.deleteText}>Delete report</Text>
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
  button: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
  delete: { paddingVertical: 12, alignItems: 'center' },
  deleteText: { fontSize: 16, fontWeight: '600', color: '#A3241B' },
});
