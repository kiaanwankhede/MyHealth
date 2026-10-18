import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ChoiceField, NumberField } from '../components/FormFields';
import { useProfile } from '../db/profile';
import { parseDecimal } from '../lib/format';
import {
  HEART_RISK_LABELS,
  LDL_TARGETS,
  validateProfile,
  type HeartRisk,
  type Profile,
  type Sex,
} from '../lib/profile';
import { syncReminders } from '../notifications/reminders';
import { colors, radius } from '../theme';

const toText = (n: number | null) => (n === null ? '' : String(n));
const toNumber = (text: string) => (text.trim() === '' ? null : parseDecimal(text));

const RISK_OPTIONS = (Object.keys(HEART_RISK_LABELS) as HeartRisk[]).map((value) => ({
  value,
  label: value === 'unknown' ? 'Not sure' : HEART_RISK_LABELS[value],
}));

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { profile, save } = useProfile();
  const [height, setHeight] = useState(toText(profile.heightCm));
  const [birthYear, setBirthYear] = useState(toText(profile.birthYear));
  const [stepGoal, setStepGoal] = useState(String(profile.stepGoal));
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [heartRisk, setHeartRisk] = useState<HeartRisk>(profile.heartRisk);
  const [saving, setSaving] = useState(false);

  const next: Profile = {
    heightCm: toNumber(height),
    birthYear: toNumber(birthYear),
    stepGoal: toNumber(stepGoal) ?? Number.NaN,
    sex,
    heartRisk,
  };
  const error = validateProfile(next, new Date());

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ ...next, birthYear: next.birthYear === null ? null : Math.round(next.birthYear) });
      // The evening walk reminder mentions the step goal.
      await syncReminders(db).catch(() => {});
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
      <Text style={styles.note}>Used for BMI, waist and lab ranges. Stays on this phone.</Text>
      <NumberField label="Height" value={height} onChangeText={setHeight} unit="cm" placeholder="170" />
      <ChoiceField
        label="Sex (for waist and kidney ranges)"
        value={sex}
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
        onChange={setSex}
      />
      <NumberField
        label="Year of birth"
        value={birthYear}
        onChangeText={setBirthYear}
        unit=""
        placeholder="1985"
      />

      <NumberField label="Daily step goal" value={stepGoal} onChangeText={setStepGoal} unit="steps" />
      <Text style={styles.note}>
        Research finds most of the health benefit by about 7,000 steps a day; 10,000 is a good stretch goal.
      </Text>

      <ChoiceField
        label="Heart-risk level (ask your doctor)"
        value={heartRisk}
        options={RISK_OPTIONS}
        onChange={setHeartRisk}
      />
      <Text style={styles.note}>
        {heartRisk === 'unknown'
          ? 'Sets your personal LDL target, following the Lipid Association of India. Until then Sehat uses general ranges.'
          : `Your LDL target: under ${LDL_TARGETS[heartRisk]} mg/dL (non-HDL under ${LDL_TARGETS[heartRisk] + 30}).`}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, (error !== null || saving) && styles.buttonDisabled]}
        onPress={onSave}
        disabled={error !== null || saving}
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
