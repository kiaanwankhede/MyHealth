import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DateField, NumberField, TextField } from '../components/FormFields';
import { deleteLabReport, getLabReport, saveLabReport } from '../db/database';
import { startOfLocalDay } from '../lib/dates';
import { parseDecimal } from '../lib/format';
import {
  GROUPS,
  TESTS,
  testsIn,
  validateReport,
  type GroupKey,
  type LabValues,
  type TestKey,
} from '../lib/labs';
import { colors, radius } from '../theme';

type Texts = Partial<Record<TestKey, string>>;

const GROUP_NOTES: Partial<Record<GroupKey, string>> = {
  lipids: 'Lp(a) is usually tested once in a lifetime. If your report shows nmol/L, divide by 2.4 for mg/dL.',
  sugar: 'Fasting glucose: after at least 8 hours without food.',
  bp: 'From a doctor’s visit or a home monitor.',
  kidney: 'Sehat works out eGFR (kidney filtration) from creatinine, your age and sex.',
};

/** Empty text means "not on this report". */
function toValues(texts: Texts): LabValues {
  const values: LabValues = {};
  for (const { key } of TESTS) {
    const text = texts[key]?.trim();
    if (text) values[key] = parseDecimal(text);
  }
  return values;
}

export default function LabReportScreen() {
  const db = useSQLiteContext();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = idParam ? Number(idParam) : null;
  const today = startOfLocalDay(new Date());

  const [date, setDate] = useState(today);
  const [lab, setLab] = useState('');
  const [texts, setTexts] = useState<Texts>({});
  const [open, setOpen] = useState<Set<GroupKey>>(new Set(['lipids']));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    getLabReport(db, id).then((r) => {
      if (!r) return;
      setDate(r.date);
      setLab(r.lab ?? '');
      setTexts(Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, String(v)])));
      setOpen(new Set(TESTS.filter((t) => r.values[t.key] !== undefined).map((t) => t.group)));
    });
  }, [db, id]);

  const values = toValues(texts);
  const errors = validateReport(values);
  const hasAny = Object.keys(values).length > 0;
  const canSave = hasAny && errors.length === 0 && !saving;

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveLabReport(db, { id, date, lab: lab.trim() || null, values });
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: id === null ? 'Add lab report' : 'Edit lab report' }} />
      <DateField label="Test date" value={date} onChange={setDate} maximumDate={today} />
      <TextField label="Lab (optional)" value={lab} onChangeText={setLab} placeholder="e.g. Thyrocare" />
      <Text style={styles.note}>Fill in only what’s on your report; leave the rest empty.</Text>

      {GROUPS.map((g) =>
        open.has(g.key) ? (
          <View key={g.key} style={styles.group}>
            <Text style={styles.groupTitle}>{g.name}</Text>
            {testsIn(g.key).map((t) => (
              <NumberField
                key={t.key}
                label={t.name}
                value={texts[t.key] ?? ''}
                onChangeText={(text) => setTexts((v) => ({ ...v, [t.key]: text }))}
                unit={t.unit}
              />
            ))}
            {GROUP_NOTES[g.key] && <Text style={styles.note}>{GROUP_NOTES[g.key]}</Text>}
          </View>
        ) : (
          <Pressable
            key={g.key}
            style={styles.addGroup}
            onPress={() => setOpen((s) => new Set(s).add(g.key))}
            accessibilityRole="button"
          >
            <Text style={styles.addGroupText}>+ {g.name}</Text>
          </Pressable>
        ),
      )}

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
  note: { fontSize: 14, lineHeight: 20, color: colors.muted },
  group: { gap: 12, paddingTop: 6 },
  groupTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  addGroup: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addGroupText: { fontSize: 16, fontWeight: '600', color: colors.teal },
  error: { fontSize: 15, color: colors.orangeDark },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
  delete: { paddingVertical: 12, alignItems: 'center' },
  deleteText: { fontSize: 16, fontWeight: '600', color: '#A3241B' },
});
