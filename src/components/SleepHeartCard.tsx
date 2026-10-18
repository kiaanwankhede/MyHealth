import { StyleSheet, Text, View } from 'react-native';

import { formatDuration, type HeartSummary, type SleepSummary } from '../lib/sleep';
import { colors, radius } from '../theme';

const time = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Sleep and resting heart rate from the watch. Renders nothing when there is no data. */
export function SleepHeartCard({ sleep, heart }: { sleep: SleepSummary | null; heart: HeartSummary | null }) {
  const hasSleep = sleep !== null && sleep.nights > 0;
  const hasHeart = heart?.latest != null;
  if (!hasSleep && !hasHeart) return null;

  return (
    <View style={styles.card}>
      {hasSleep && (
        <View style={styles.half}>
          <Text style={styles.label}>Sleep</Text>
          <Text style={styles.value}>{sleep.last ? formatDuration(sleep.last.asleepMinutes) : '–'}</Text>
          {sleep.last && (
            <Text style={styles.sub}>
              {time(sleep.last.bedtime)}–{time(sleep.last.wake)}
            </Text>
          )}
          <Text style={styles.sub}>
            Avg {formatDuration(sleep.averageMinutes!)} ({sleep.nights}{' '}
            {sleep.nights === 1 ? 'night' : 'nights'})
          </Text>
        </View>
      )}
      {hasHeart && (
        <View style={styles.half}>
          <Text style={styles.label}>Resting heart rate</Text>
          <Text style={styles.value}>{heart!.latest!.bpm} bpm</Text>
          {heart!.average !== null && <Text style={styles.sub}>7-day avg {heart!.average} bpm</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
  },
  half: { flex: 1, gap: 2 },
  label: { fontSize: 15, color: colors.muted },
  value: { fontSize: 22, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted },
});
