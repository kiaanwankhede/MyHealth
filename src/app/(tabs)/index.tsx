import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect } from 'react';
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
import { Delta } from '../../components/Delta';
import { DoseList } from '../../components/DoseList';
import { PlateauCard } from '../../components/PlateauCard';
import { SleepHeartCard } from '../../components/SleepHeartCard';
import { StepsRing } from '../../components/StepsRing';
import { WeeklyCard } from '../../components/WeeklyCard';
import { useProfile } from '../../db/profile';
import { useLabReports } from '../../health/useLabReports';
import { useMedicines } from '../../health/useMedicines';
import { useSteps } from '../../health/useSteps';
import { useTodayHealth } from '../../health/useTodayHealth';
import { useWatchData } from '../../health/useWatchData';
import { useWeightGoal } from '../../health/useWeightGoal';
import { formatDayHeading, formatDayMonth, formatRelativeDay, greetingFor } from '../../lib/dates';
import { formatCount, formatKg, percentOfGoal } from '../../lib/format';
import { describeStatus } from '../../lib/goal';
import { classify, latest, type LabContext } from '../../lib/labs';
import { ageOn } from '../../lib/profile';
import { detectPlateau, weeklyReview } from '../../lib/review';
import { syncReminders } from '../../notifications/reminders';
import { buildSnapshot } from '../../widget/snapshot';
import { updateWidget } from '../../widget/updateWidget';
import { describeRetro, retroGoal } from '../../lib/steps';
import { colors, radius, toneColors } from '../../theme';

export default function TodayScreen() {
  const { status, steps, weight, error, refreshing, refresh, connect } = useTodayHealth();
  const weightGoal = useWeightGoal();
  const stepHistory = useSteps();
  const { reports } = useLabReports();
  const watch = useWatchData();
  const meds = useMedicines();
  const db = useSQLiteContext();

  // Keep scheduled reminders in line with the latest data (e.g. a new lab report's due date).
  useFocusEffect(
    useCallback(() => {
      syncReminders(db).catch(() => {});
    }, [db]),
  );
  const { profile } = useProfile();
  const stepGoal = profile.stepGoal;
  const now = new Date();
  const stepsPercent = percentOfGoal(steps ?? 0, stepGoal);
  // History newest first, with today's live count in front.
  const newestFirst = stepHistory.days.map((d) => d.steps).reverse();
  if (steps !== null) newestFirst[0] = steps;
  const retro = retroGoal(newestFirst, stepGoal);
  const latestLdl = reports ? latest(reports, 'ldl') : null;
  const labCtx: LabContext = { heartRisk: profile.heartRisk, sex: profile.sex, age: ageOn(profile, now) };
  const review = weeklyReview({
    series: weightGoal.series,
    steps: stepHistory.days,
    stepGoal,
    reports: reports ?? [],
    now,
  });
  const plateau =
    weightGoal.progress && !weightGoal.progress.reached && detectPlateau(weightGoal.series, now);

  // Keep the home-screen widget in step with what this screen shows.
  const trendKg = weightGoal.latest?.trend ?? null;
  const widgetKey = `${steps}|${stepGoal}|${retro.state}|${trendKg}|${weightGoal.progress?.percent}|${weightGoal.progress?.behindKg}`;
  useEffect(() => {
    if (status !== 'ready' || steps === null) return;
    updateWidget(
      db,
      buildSnapshot({
        steps,
        goal: stepGoal,
        retro,
        trendKg,
        progress: weightGoal.progress,
        now: new Date(),
      }),
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
              watch.reload();
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

        {status !== 'loading' && status !== 'ready' && <ConnectCard status={status} onConnect={connect} />}

        {status === 'ready' && (
          <>
            <Pressable
              style={[styles.card, styles.stepsCard]}
              onPress={() => router.push('/steps')}
              accessibilityRole="button"
            >
              <View style={styles.row}>
                <StepsRing percent={stepsPercent} />
                <View style={styles.shrink}>
                  <Text style={styles.bigNumber}>{formatCount(steps ?? 0)}</Text>
                  <Text style={styles.muted}>of {formatCount(stepGoal)} steps</Text>
                  <Text style={styles.stepsPercent}>{stepsPercent}% of goal</Text>
                  <Delta
                    value={
                      steps !== null && stepHistory.yesterdaySoFar !== null
                        ? steps - stepHistory.yesterdaySoFar
                        : null
                    }
                    format={formatCount}
                    better="up"
                    suffix="vs this time yesterday"
                  />
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
            {plateau && <PlateauCard />}
            <SleepHeartCard
              sleep={watch.sleep}
              heart={watch.heart}
              sleepWeekBefore={watch.sleepWeekBefore}
              heartWeekBefore={watch.heartWeekBefore}
            />
            {meds.today.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Medicines · {meds.today.filter((d) => d.taken).length} of {meds.today.length} taken
                </Text>
                <DoseList doses={meds.today} onToggle={meds.toggle} />
              </View>
            )}

            <Pressable
              style={[styles.card, styles.rowBetween]}
              onPress={() => router.push(latestLdl ? '/labs' : '/lab-report')}
              accessibilityRole="button"
            >
              <View>
                <Text style={styles.muted}>LDL cholesterol</Text>
                {latestLdl ? (
                  <LdlStatus ldl={latestLdl.value} date={latestLdl.date} ctx={labCtx} />
                ) : (
                  <Text style={styles.trend}>Add a lab report</Text>
                )}
              </View>
              <Text style={styles.value}>{latestLdl ? `${formatCount(latestLdl.value)} mg/dL` : '–'}</Text>
            </Pressable>

            <WeeklyCard review={review} stepGoal={stepGoal} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LdlStatus({ ldl, date, ctx }: { ldl: number; date: Date; ctx: LabContext }) {
  const c = classify('ldl', ldl, ctx)!;
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
  shrink: { flexShrink: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
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
