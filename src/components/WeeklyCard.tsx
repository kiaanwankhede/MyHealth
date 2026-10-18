import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCount, formatKg } from '../lib/format';
import type { WeeklyReview } from '../lib/review';
import { colors, radius } from '../theme';

/** "This week" on Today: weight trend change, steps against the goal, lab tests due. */
export function WeeklyCard({ review, stepGoal }: { review: WeeklyReview; stepGoal: number }) {
  const { trendChangeKg, stepsAverage, goalDays, labsDue } = review;
  const trendText =
    trendChangeKg === null
      ? 'Needs a week of weigh-ins'
      : Math.abs(trendChangeKg) < 0.05
        ? 'Steady'
        : `${trendChangeKg < 0 ? '−' : '+'}${formatKg(Math.abs(trendChangeKg))} kg`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Last 7 days</Text>
      <Line label="Weight trend" value={trendText} />
      <Line
        label="Steps per day"
        value={stepsAverage === null ? '–' : `${formatCount(stepsAverage)} · ${goalDays} of 7 at goal`}
      />
      {stepsAverage !== null && stepsAverage < stepGoal && stepsAverage < 7000 && (
        <Text style={styles.hint}>Most of the health benefit comes by about 7,000 steps a day.</Text>
      )}
      {labsDue.map((d) => (
        <Pressable key={d.group} onPress={() => router.push('/labs')} accessibilityRole="button">
          <Text style={styles.due}>{d.name} test due</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, gap: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 15, color: colors.muted },
  value: { fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
  hint: { fontSize: 14, color: colors.muted },
  due: { fontSize: 15, fontWeight: '600', color: '#8A3A0E' },
});
