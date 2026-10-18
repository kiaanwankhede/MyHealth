import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectCard } from '../../components/ConnectCard';
import { WeightChart } from '../../components/WeightChart';
import { useWeightGoal } from '../../health/useWeightGoal';
import { formatDate, formatDayMonth, formatRelativeDay } from '../../lib/dates';
import { formatKg } from '../../lib/format';
import { describeStatus } from '../../lib/goal';
import { colors, radius } from '../../theme';

export default function WeightScreen() {
  const { status, goal, series, progress, latest, fullAccess, error, connect } = useWeightGoal();
  const today = new Date();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Weight</Text>
          {status === 'ready' && (
            <Pressable style={styles.pill} onPress={() => router.push('/log-weight')} accessibilityRole="button">
              <Text style={styles.pillText}>+ Log</Text>
            </Pressable>
          )}
        </View>

        {status === 'loading' && !error && <ActivityIndicator color={colors.teal} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {status !== 'loading' && status !== 'ready' && <ConnectCard status={status} onConnect={connect} />}

        {status === 'ready' && (
          <>
            {!fullAccess && (
              <Pressable style={styles.access} onPress={connect} accessibilityRole="button">
                <Text style={styles.accessText}>
                  Allow Sehat to save weigh-ins and read your older weight history.
                </Text>
                <Text style={styles.link}>Allow access</Text>
              </Pressable>
            )}

            {latest ? (
              <View style={styles.bigRow}>
                <Text style={styles.big}>{formatKg(latest.kg)}</Text>
                <Text style={styles.muted}>
                  kg · {formatRelativeDay(latest.date, today).toLowerCase()} · trend {formatKg(latest.trend)}
                </Text>
              </View>
            ) : (
              <Text style={styles.muted}>No weigh-ins in Health Connect yet. Tap “+ Log” to add one.</Text>
            )}

            {series.length > 0 && <WeightChart series={series} goal={goal} progress={progress} today={today} />}

            {goal && progress && (
              <>
                <StatusPill text={describeStatus(progress).text} tone={describeStatus(progress).tone} />
                <View style={styles.grid}>
                  <Stat label="Lost" value={`${formatKg(Math.max(0, progress.lostKg))} kg`} />
                  <Stat label="To go" value={`${formatKg(progress.toGoKg)} kg`} />
                  <Stat
                    label="Pace kg/week"
                    value={progress.paceKgPerWeek === null ? '–' : progress.paceKgPerWeek.toFixed(2)}
                  />
                  <Stat
                    label="Finish"
                    value={progress.projectedFinish ? formatDayMonth(progress.projectedFinish) : '–'}
                  />
                </View>
                {progress.paceKgPerWeek === null && (
                  <Text style={styles.note}>Pace and finish date appear after a week of weigh-ins.</Text>
                )}
              </>
            )}

            {goal ? (
              <Pressable style={styles.goalRow} onPress={() => router.push('/goal')} accessibilityRole="button">
                <Text style={styles.goalText}>
                  Goal: {formatKg(goal.targetKg)} kg by {formatDate(goal.targetDate)}
                </Text>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            ) : (
              <View style={styles.cta}>
                <Text style={styles.ctaTitle}>Set a weight-loss goal</Text>
                <Text style={styles.muted}>
                  Pick a target weight and date. Sehat works out the pace you need and tells you every day if
                  you’re ahead or behind.
                </Text>
                <Pressable style={styles.button} onPress={() => router.push('/goal')} accessibilityRole="button">
                  <Text style={styles.buttonText}>Set goal</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function StatusPill({ text, tone }: { text: string; tone: 'good' | 'warn' }) {
  const warn = tone === 'warn';
  return (
    <View style={[styles.status, { backgroundColor: warn ? colors.orangeSoft : colors.tealSoft }]}>
      <Text style={[styles.statusText, { color: warn ? '#8A3A0E' : colors.tealDark }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  pill: { backgroundColor: colors.teal, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  pillText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  big: { fontSize: 44, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 16, lineHeight: 22, color: colors.muted },
  error: { fontSize: 16, color: colors.orangeDark },
  status: { borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  statusText: { fontSize: 16, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.pill, padding: 12 },
  statLabel: { fontSize: 14, color: colors.muted },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 2 },
  note: { fontSize: 14, color: colors.muted },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  goalText: { fontSize: 16, color: colors.ink },
  link: { fontSize: 16, fontWeight: '600', color: colors.teal },
  access: { backgroundColor: colors.orangeSoft, borderRadius: radius.pill, padding: 14, gap: 6 },
  accessText: { fontSize: 15, lineHeight: 21, color: '#8A3A0E' },
  cta: { backgroundColor: colors.tealSoft, borderRadius: radius.card, padding: 20, gap: 10 },
  ctaTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  button: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
});
