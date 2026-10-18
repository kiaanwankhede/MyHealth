import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectCard } from '../../components/ConnectCard';
import { RetroGoalCard } from '../../components/RetroGoalCard';
import { StepsBarChart } from '../../components/StepsBarChart';
import { DAILY_STEP_GOAL } from '../../config';
import { requestHealthConnectAccess } from '../../health/healthConnect';
import { useSteps } from '../../health/useSteps';
import { useWeightGoal } from '../../health/useWeightGoal';
import { formatDayMonth } from '../../lib/dates';
import { formatCount } from '../../lib/format';
import { distanceKm, kcalFromSteps, retroGoal, stepStats } from '../../lib/steps';
import { colors, radius } from '../../theme';

type Range = 7 | 30;

export default function StepsScreen() {
  const { status, days, error, reload } = useSteps();
  const { latest } = useWeightGoal();
  const [range, setRange] = useState<Range>(7);

  const today = days.length ? days[days.length - 1].steps : 0;
  const shown = days.slice(-range);
  const stats = stepStats(shown, DAILY_STEP_GOAL);
  const retro = retroGoal([...days].reverse().map((d) => d.steps), DAILY_STEP_GOAL);
  const toGo = Math.max(0, DAILY_STEP_GOAL - today);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      >
        <Text style={styles.title}>Steps</Text>

        {status === 'loading' && !error && <ActivityIndicator color={colors.teal} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {status !== 'loading' && status !== 'ready' && (
          <ConnectCard
            status={status}
            onConnect={async () => {
              await requestHealthConnectAccess();
              await reload();
            }}
          />
        )}

        {status === 'ready' && (
          <>
            <View style={styles.bigRow}>
              <Text style={styles.big}>{formatCount(today)}</Text>
              <Text style={styles.muted}>today</Text>
            </View>
            <Text style={styles.goalLine}>
              Goal {formatCount(DAILY_STEP_GOAL)} ·{' '}
              {toGo > 0 ? `${formatCount(toGo)} to go` : 'done for today'}
            </Text>

            <RetroGoalCard retro={retro} />

            <View style={styles.toggle}>
              {([7, 30] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.toggleItem, range === r && styles.toggleActive]}
                  onPress={() => setRange(r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: range === r }}
                >
                  <Text style={[styles.toggleText, range === r && styles.toggleTextActive]}>
                    {r === 7 ? 'Week' : '30 days'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <StepsBarChart days={shown} goal={DAILY_STEP_GOAL} />

            <View style={styles.list}>
              <Row label={`${range}-day average`} value={formatCount(stats.average)} />
              <Row label="Goal days" value={`${stats.goalDays} of ${shown.length}`} />
              {stats.best && stats.best.steps > 0 && (
                <Row
                  label="Best day"
                  value={`${formatCount(stats.best.steps)} · ${formatDayMonth(stats.best.date)}`}
                />
              )}
              <Row label="Distance today" value={`≈ ${distanceKm(today).toFixed(1)} km`} />
              <Row label="Burned from steps" value={`≈ ${formatCount(kcalFromSteps(today, latest?.trend))} kcal`} />
            </View>
            <Text style={styles.note}>Distance and calories are estimates from your step count.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  error: { fontSize: 16, color: colors.orangeDark },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  big: { fontSize: 44, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 16, color: colors.muted },
  goalLine: { fontSize: 16, fontWeight: '600', color: colors.orangeDark },
  toggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill, padding: 4 },
  toggleItem: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { fontSize: 15, color: colors.muted },
  toggleTextActive: { fontWeight: '700', color: colors.ink },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  value: { fontSize: 16, fontWeight: '600', color: colors.ink },
  note: { fontSize: 13, color: colors.muted },
});
