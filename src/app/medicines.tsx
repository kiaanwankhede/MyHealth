import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DoseList } from '../components/DoseList';
import { useMedicines } from '../health/useMedicines';
import { formatDate } from '../lib/dates';
import { isActive } from '../lib/medicines';
import { colors, radius } from '../theme';

export default function MedicinesScreen() {
  const { medicines, today, toggle } = useMedicines();
  const now = new Date();
  const current = medicines?.filter((m) => isActive(m, now)) ?? [];
  const stopped = medicines?.filter((m) => !isActive(m, now)) ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {medicines === null && <ActivityIndicator color={colors.teal} />}

      {today.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.title}>Today</Text>
          <DoseList doses={today} onToggle={toggle} />
        </View>
      )}

      {medicines?.length === 0 && (
        <Text style={styles.muted}>
          Add the medicines you take, such as a statin or thyroid tablet. Sehat can remind you at the right
          time, and your doctor summary lists when you started each one.
        </Text>
      )}

      {current.map((m) => (
        <Row
          key={m.id}
          id={m.id}
          title={m.name}
          subtitle={[m.dose, m.times.join(', '), `since ${formatDate(m.startDate)}`]}
        />
      ))}

      <Pressable style={styles.button} onPress={() => router.push('/medicine')} accessibilityRole="button">
        <Text style={styles.buttonText}>Add medicine</Text>
      </Pressable>

      {stopped.length > 0 && <Text style={styles.section}>Stopped</Text>}
      {stopped.map((m) => (
        <Row
          key={m.id}
          id={m.id}
          title={m.name}
          subtitle={[
            m.dose,
            `${formatDate(m.startDate)} – ${m.stoppedDate ? formatDate(m.stoppedDate) : ''}`,
          ]}
        />
      ))}
    </ScrollView>
  );
}

function Row({ id, title, subtitle }: { id: number; title: string; subtitle: (string | null)[] }) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: '/medicine', params: { id: String(id) } })}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.muted}>{subtitle.filter(Boolean).join(' · ')}</Text>
      </View>
      <Text style={styles.link}>Edit</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, gap: 6 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  section: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 8 },
  muted: { fontSize: 15, lineHeight: 21, color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  link: { fontSize: 15, fontWeight: '600', color: colors.teal },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
});
