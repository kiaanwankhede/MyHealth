import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { DateField, NumberField } from '../components/FormFields';
import { addWaist } from '../db/database';
import { validateWaist } from '../lib/body';
import { startOfLocalDay } from '../lib/dates';
import { parseDecimal } from '../lib/format';
import { colors, radius } from '../theme';

export default function LogWaistScreen() {
  const db = useSQLiteContext();
  const today = startOfLocalDay(new Date());
  const [date, setDate] = useState(today);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const cm = text.trim() === '' ? null : parseDecimal(text);
  const error = cm === null ? null : validateWaist(cm);
  const canSave = cm !== null && error === null && !saving;

  const onSave = async () => {
    setSaving(true);
    try {
      await addWaist(db, date, cm!);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <NumberField label="Waist" value={text} onChangeText={setText} unit="cm" placeholder="0.0" highlight />
      <Text style={styles.note}>
        Measure around your belly at the navel, standing relaxed, after breathing out. Same time of day each
        time.
      </Text>
      <DateField label="Date" value={date} onChange={setDate} maximumDate={today} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, !canSave && styles.buttonDisabled]}
        onPress={onSave}
        disabled={!canSave}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  note: { fontSize: 14, lineHeight: 20, color: colors.muted },
  error: { fontSize: 15, color: colors.orangeDark },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
});
