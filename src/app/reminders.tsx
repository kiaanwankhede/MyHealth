import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { getReminderSettings, saveReminderSettings } from '../db/database';
import { formatTime, parseTime } from '../lib/medicines';
import { DEFAULT_REMINDERS, type ReminderSettings } from '../lib/reminders';
import { ensureNotificationPermission, syncReminders } from '../notifications/reminders';
import { colors, radius } from '../theme';

const DEFAULT_TIMES = { weighIn: '07:30', steps: '19:00' } as const;

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    getReminderSettings(db).then(setSettings);
  }, [db]);

  const update = async (next: ReminderSettings) => {
    const turningOn =
      (next.weighIn && !settings.weighIn) || (next.steps && !settings.steps) || (next.labs && !settings.labs);
    if (turningOn && !(await ensureNotificationPermission())) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    setSettings(next);
    await saveReminderSettings(db, next);
    await syncReminders(db).catch(() => {});
  };

  const pickTime = (key: 'weighIn' | 'steps') => {
    const { hour, minute } = parseTime(settings[key] ?? DEFAULT_TIMES[key]);
    DateTimePickerAndroid.open({
      value: new Date(2026, 0, 1, hour, minute),
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date)
          update({ ...settings, [key]: formatTime(date.getHours(), date.getMinutes()) });
      },
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {blocked && (
        <Pressable style={styles.blocked} onPress={() => Linking.openSettings()} accessibilityRole="button">
          <Text style={styles.blockedText}>
            Notifications are turned off for Sehat. Tap to open settings and allow them.
          </Text>
        </Pressable>
      )}

      <Toggle
        title="Morning weigh-in"
        subtitle="A daily nudge to weigh yourself before breakfast."
        time={settings.weighIn}
        onToggle={(on) => update({ ...settings, weighIn: on ? DEFAULT_TIMES.weighIn : null })}
        onPickTime={() => pickTime('weighIn')}
      />
      <Toggle
        title="Evening walk"
        subtitle="A daily reminder to fit in a walk before the day ends."
        time={settings.steps}
        onToggle={(on) => update({ ...settings, steps: on ? DEFAULT_TIMES.steps : null })}
        onPickTime={() => pickTime('steps')}
      />
      <Toggle
        title="Lab re-tests"
        subtitle="On the day a test is due again, e.g. cholesterol a year after the last one."
        time={null}
        value={settings.labs}
        onToggle={(on) => update({ ...settings, labs: on })}
      />

      <Pressable style={styles.link} onPress={() => router.push('/medicines')} accessibilityRole="button">
        <Text style={styles.linkText}>Medicine reminders are set for each medicine →</Text>
      </Pressable>
    </ScrollView>
  );
}

type ToggleProps = {
  title: string;
  subtitle: string;
  time: string | null;
  value?: boolean;
  onToggle: (on: boolean) => void;
  onPickTime?: () => void;
};

function Toggle({ title, subtitle, time, value, onToggle, onPickTime }: ToggleProps) {
  const on = value ?? time !== null;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Switch
          value={on}
          onValueChange={onToggle}
          trackColor={{ true: colors.teal }}
          accessibilityLabel={title}
        />
      </View>
      {on && time && onPickTime && (
        <Pressable
          style={styles.time}
          onPress={onPickTime}
          accessibilityRole="button"
          accessibilityLabel={`${title} time`}
        >
          <Text style={styles.timeText}>{time}</Text>
          <Text style={styles.change}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.pill, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 17, fontWeight: '600', color: colors.ink },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 2 },
  time: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  timeText: { fontSize: 22, fontWeight: '700', color: colors.ink },
  change: { fontSize: 15, fontWeight: '600', color: colors.teal },
  blocked: { backgroundColor: colors.orangeSoft, borderRadius: radius.pill, padding: 14 },
  blockedText: { fontSize: 15, lineHeight: 21, color: '#8A3A0E' },
  link: { paddingVertical: 8 },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.teal },
});
