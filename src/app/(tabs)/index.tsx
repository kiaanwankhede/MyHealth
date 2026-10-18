import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectCard } from '../../components/ConnectCard';
import { StepsRing } from '../../components/StepsRing';
import { DAILY_STEP_GOAL } from '../../config';
import { useLabReports } from '../../health/useLabReports';
import { useSteps } from '../../health/useSteps';
import { useTodayHealth } from '../../health/useTodayHealth';
import { useWeightGoal } from '../../health/useWeightGoal';
import { formatDayHeading, formatDayMonth, formatRelativeDay, greetingFor } from '../../lib/dates';
import { formatCount, formatKg, percentOfGoal } from '../../lib/format';
import { classify } from '../../lib/cholesterol';
import { describeStatus } from '../../lib/goal';
import { describeRetro, retroGoal } from '../../lib/steps';
import { colors, radius, toneColors } from '../../theme';
import { buildSnapshot } from '../../widget/snapshot';
import { updateWidget } from '../../widget/updateWidget';

export default function TodayScreen() {
  const { status, steps, weight, error, refreshing, refresh, connect } = useTodayHealth();
  const weightGoal = useWeightGoal();
  const stepHistory = useSteps();
  const { reports } = useLabReports();
  const now = new Date();
  const stepsPercent = percentOfGoal(steps ?? 0, DAILY_STEP_GOAL);
  // History newest first, with today's live count in front.
  const newestFirst = stepHistory.days.map((d) => d.steps).reverse();
  if (steps !== null) newestFirst[0] = steps;
  const retro = retroGoal(newestFirst, DAILY_STEP_GOAL);
  const latestLdl = reports?.find((r) => r.ldl !== null);

  // Keep the home-screen widget in step with what this screen shows.
  const db = useSQLiteContext();
  const trendKg = weightGoal.latest?.trend ?? null;
  const widgetKey = `${steps}|${retro.state}|${trendKg}|${weightGoal.progress?.percent}|${weightGoal.progress?.behindKg}`;
  useEffect(() => {
    if (status !== 'ready' || steps === null) return;
    updateWidget(
      db,
      buildSnapshot({ steps, goal: DAILY_STEP_GOAL, retro, trendKg, progress: weightGoal.progress, now: new Date() }),
    ).catch(() => {});
    // widgetKey captures every value the widget shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, status, widgetKey]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh();
              weightGoal.reload();
              stepHistory.reload();
            }}
          />
        }
      >
        <View>
          <Text style={styles.date}>{formatDayHeading(now)}</Text>
          <Text style={styles.greeting}>{greetingFor(now)}</Text>
        </View>

        {status === 'loading' && !error && <ActivityIndicator color={colors.teal} />}

        {error && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.muted}>Pull down to try again.</Text>
          </View>
        )}

        {status !== 'loading' && status !== 'ready' && (
          <ConnectCard status={status} onConnect={connect} />
        )}

        {status === 'ready' && (
          <>
            <Pressable
              style={[styles.card, styles.stepsCard]}
              onPress={() => router.push('/steps')}
              accessibilityRole="button"
            >
              <View style={styles.row}>
                <StepsRing percent={stepsPercent} />
                <View>
                  <Text style={styles.bigNumber}>{formatCount(steps ?? 0)}</Text>
                  <Text style={styles.muted}>of {formatCount(DAILY_STEP_GOAL)} steps</Text>
                  <Text style={styles.stepsPercent}>{stepsPercent}% of goal</Text>
                </View>
              </View>
              {retro.state !== 'today' && <Text style={styles.retro}>{describeRetro(retro)}</Text>}
            </Pressable>

            <Pressable
              style={[styles.card, styles.rowBetween]}
              onPress={() => router.push('/weight')}
              accessibilityRole="button"
            >
              <View>
                <Text style={styles.muted}>Weight</Text>
                {weightGoal.latest ? (
                  <Text style={styles.trend}>Trend {formatKg(weightGoal.latest.trend)} kg</Text>
                ) : (
                  <Text style={styles.muted}>
                    {weight ? formatRelativeDay(weight.time, now) : 'No weigh-ins yet'}
                  </Text>
                )}
              </View>
              <Text style={styles.value}>{weight ? `${formatKg(weight.kg)} kg` : '–'}</Text>
            </Pressable>

            <GoalCard {...weightGoal} />

            <Pressable
              style={[styles.card, styles.rowBetween]}
              onPress={() => router.push(latestLdl ? '/labs' : '/lab-report')}
              accessibilityRole="button"
            >
              <View>
                <Text style={styles.muted}>LDL cholesterol</Text>
                {latestLdl ? (
                  <LdlStatus ldl={latestLdl.ldl!} date={latestLdl.date} />
                ) : (
                  <Text style={styles.trend}>Add a lab report</Text>
                )}
              </View>
              <Text style={styles.value}>{latestLdl ? `${formatCount(latestLdl.ldl!)} mg/dL` : '–'}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LdlStatus({ ldl, date }: { ldl: number; date: Date }) {
  const c = classify('ldl', ldl);
  return (
    <Text style={[styles.ldlStatus, { color: toneColors[c.tone] }]}>
      {c.label} · {formatDayMonth(date)}
    </Text>
  );
}

function GoalCard({ goal, progress }: ReturnType<typeof useWeightGoal>) {
  if (!goal) {
    return (
      <Pressable
        style={[styles.card, styles.goalCard]}
        onPress={() => router.push('/goal')}
        accessibilityRole="button"
      >
        <Text style={styles.goalTitle}>Set a weight-loss goal</Text>
        <Text style={styles.goalBody}>Pick a target weight and date, and Sehat tracks the pace for you.</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      style={[styles.card, styles.goalCard]}
      onPress={() => router.push('/weight')}
      accessibilityRole="button"
    >
      <Text style={styles.goalTitle}>
        Goal: {formatKg(goal.targetKg)} kg by {formatDayMonth(goal.targetDate)}
      </Text>
      {progress && (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress.percent}%` }]} />
          </View>
          <Text style={styles.goalBody}>
            {progress.percent}% · {describeStatus(progress).text}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  date: { fontSize: 16, color: colors.muted },
  greeting: { fontSize: 28, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigNumber: { fontSize: 32, fontWeight: '700', color: colors.ink },
  value: { fontSize: 24, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 16, color: colors.muted },
  stepsPercent: { fontSize: 16, fontWeight: '600', color: colors.orangeDark },
  trend: { fontSize: 16, fontWeight: '600', color: colors.teal },
  stepsCard: { gap: 12 },
  retro: { fontSize: 15, fontWeight: '600', color: colors.orangeDark },
  ldlStatus: { fontSize: 15, fontWeight: '600' },
  goalCard: { backgroundColor: colors.tealSoft, gap: 8 },
  goalTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  goalBody: { fontSize: 15, color: colors.tealDark },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6, backgroundColor: colors.teal },
  errorCard: { backgroundColor: colors.orangeSoft, gap: 4 },
  errorText: { fontSize: 16, fontWeight: '600', color: colors.orangeDark },
});
