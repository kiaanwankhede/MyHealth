import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DateField, KgField } from '../components/FormFields';
import { getCurrentGoal, saveGoal } from '../db/database';
import { readLatestWeight } from '../health/healthConnect';
import { addDays, formatDate, startOfLocalDay } from '../lib/dates';
import { formatKg, parseDecimal } from '../lib/format';
import { planGoal, validateGoal, type Goal } from '../lib/goal';
import { colors, radius } from '../theme';

const DEFAULT_WEEKS = 16;

export default function GoalScreen() {
  const db = useSQLiteContext();
  const today = startOfLocalDay(new Date());

  const [startKg, setStartKg] = useState('');
  const [targetKg, setTargetKg] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [targetDate, setTargetDate] = useState(addDays(today, DEFAULT_WEEKS * 7));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Prefill from the current goal, or the latest weigh-in for a new goal.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getCurrentGoal(db);
      if (cancelled) return;
      if (existing) {
        setStartKg(formatKg(existing.startKg));
        setTargetKg(formatKg(existing.targetKg));
        setStartDate(existing.startDate);
        setTargetDate(existing.targetDate);
        return;
      }
      try {
        const latest = await readLatestWeight();
        if (!cancelled && latest) setStartKg(formatKg(latest.kg));
      } catch {
        // No Health Connect access yet: the user types the start weight.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const goal: Goal = {
    startDate,
    startKg: parseDecimal(startKg),
    targetKg: parseDecimal(targetKg),
    targetDate,
  };
  const error = startKg && targetKg ? validateGoal(goal) : null;
  const plan = startKg && targetKg && !error ? planGoal(goal) : null;

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveGoal(db, goal);
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the goal.');
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <KgField label="Start weight" value={startKg} onChangeText={setStartKg} />
      <DateField label="Start date" value={startDate} onChange={setStartDate} maximumDate={today} />
      <KgField label="Target weight" value={targetKg} onChangeText={setTargetKg} highlight />
      <DateField
        label="Target date"
        value={targetDate}
        onChange={setTargetDate}
        minimumDate={addDays(startDate, 7)}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {plan && (
        <View style={styles.plan}>
          <Text style={styles.planLabel}>YOUR PLAN</Text>
          <Text style={styles.planHeadline}>
            −{formatKg(plan.kgToLose)} kg · {plan.totalDays} days
          </Text>
          <Text style={styles.planLine}>{plan.kgPerWeek.toFixed(2)} kg per week</Text>
          <Text style={styles.planLine}>≈ {Math.round(plan.kcalPerDay)} kcal/day below what you burn</Text>
          {plan.isSafe ? (
            <Text style={styles.safe}>✓ Safe pace (no more than 1% of body weight a week)</Text>
          ) : (
            <View style={styles.warnBox}>
              <Text style={styles.warn}>
                That’s faster than {formatKg(plan.maxSafeKgPerWeek)} kg a week (1% of your body weight). The
                earliest safe date is {formatDate(plan.earliestSafeDate)}.
              </Text>
              <Pressable onPress={() => setTargetDate(plan.earliestSafeDate)} accessibilityRole="button">
                <Text style={styles.link}>Use {formatDate(plan.earliestSafeDate)}</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {saveError && <Text style={styles.error}>{saveError}</Text>}

      <Pressable
        style={[styles.button, (!plan || saving) && styles.buttonDisabled]}
        onPress={onSave}
        disabled={!plan || saving}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save goal'}</Text>
      </Pressable>

      <Text style={styles.footnote}>
        The calorie figure assumes about 7,700 kcal per kg of body fat. It’s a guide, not medical advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 16 },
  error: { fontSize: 15, color: colors.orangeDark },
  plan: { backgroundColor: colors.tealSoft, borderRadius: radius.card, padding: 16, gap: 6 },
  planLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: colors.tealDark },
  planHeadline: { fontSize: 22, fontWeight: '700', color: colors.ink },
  planLine: { fontSize: 16, color: '#24372F' },
  safe: { fontSize: 15, fontWeight: '600', color: colors.tealDark, marginTop: 4 },
  warnBox: { backgroundColor: colors.orangeSoft, borderRadius: 12, padding: 12, gap: 8, marginTop: 4 },
  warn: { fontSize: 15, lineHeight: 21, color: '#8A3A0E' },
  link: { fontSize: 15, fontWeight: '700', color: colors.teal },
  button: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
