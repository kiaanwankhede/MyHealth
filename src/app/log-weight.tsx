import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField, KgField } from '../components/FormFields';
import { openHealthConnectSettings, readLatestWeight, writeWeight } from '../health/healthConnect';
import { calendarDaysBetween, startOfLocalDay } from '../lib/dates';
import { formatKg, parseDecimal } from '../lib/format';
import { colors, radius } from '../theme';

/** A past day's weigh-in is recorded at 8 am; today's at the current time. */
function timeFor(day: Date, now: Date): Date {
  if (calendarDaysBetween(day, now) === 0) return now;
  const t = startOfLocalDay(day);
  t.setHours(8);
  return t;
}

export default function LogWeightScreen() {
  const today = startOfLocalDay(new Date());
  const [kg, setKg] = useState('');
  const [day, setDay] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readLatestWeight()
      .then((latest) => latest && setKg((current) => current || formatKg(latest.kg)))
      .catch(() => {});
  }, []);

  const value = parseDecimal(kg);
  const valid = value > 20 && value < 400;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await writeWeight(value, timeFor(day, new Date()));
      router.back();
    } catch {
      setError('Sehat isn’t allowed to save weight. Turn on “Weight” write access for Sehat in Health Connect.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KgField label="Weight" value={kg} onChangeText={setKg} highlight />
      <DateField label="Day" value={day} onChange={setDay} maximumDate={today} />
      <Text style={styles.note}>Saved to Health Connect, so Google Fit and other apps see it too.</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={openHealthConnectSettings} accessibilityRole="button">
            <Text style={styles.link}>Open Health Connect</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.button, (!valid || saving) && styles.buttonDisabled]}
        onPress={onSave}
        disabled={!valid || saving}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, padding: 20, gap: 16 },
  note: { fontSize: 14, color: colors.muted },
  errorBox: { backgroundColor: colors.orangeSoft, borderRadius: 12, padding: 12, gap: 8 },
  error: { fontSize: 15, lineHeight: 21, color: '#8A3A0E' },
  link: { fontSize: 15, fontWeight: '700', color: colors.teal },
  button: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
});
