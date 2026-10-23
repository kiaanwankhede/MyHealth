import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
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
import { RetroGoalCard } from '../../components/RetroGoalCard';
import { StepsBarChart } from '../../components/StepsBarChart';
import { YearInsights } from '../../components/YearInsights';
import { useProfile } from '../../db/profile';
import { requestHealthConnectAccess } from '../../health/healthConnect';
import { useSteps } from '../../health/useSteps';
import { formatDayMonth } from '../../lib/dates';
import { formatCount } from '../../lib/format';
import {
  comparePeriods,
  distanceKm,
  retroGoal,
  yearChange,
  yearInsights,
} from '../../lib/steps';
import { colors, radius } from '../../theme';

type Range = 7 | 30;

export default function StepsScreen() {
  const { status, days, fullAccess, yesterdaySoFar, error, reload } = useSteps();
  const [range, setRange] = useState<Range>(7);
  const { stepGoal } = useProfile().profile;

  const today = days.length ? days[days.length - 1].steps : 0;
  const shown = days.slice(-range);
  const { current: stats, previous } = comparePeriods(days, range, stepGoal);
  const vsYesterday = yesterdaySoFar === null || days.length < 2 ? null : today - yesterdaySoFar;
  const retro = retroGoal(
    [...days].reverse().map((d) => d.steps),
    stepGoal,
  );
  const toGo = Math.max(0, stepGoal - today);
  const year = yearInsights(days, stepGoal);
  const yearDelta = yearChange(days, stepGoal);

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
              <Delta value={vsYesterday} format={formatCount} better="up" suffix="vs this time yesterday" />
            </View>
            <Text style={styles.goalLine}>
              Goal {formatCount(stepGoal)} · {toGo > 0 ? `${formatCount(toGo)} to go` : 'done for today'}
            </Text>

            <RetroGoalCard retro={retro} />

            {!fullAccess && (
              <Pressable
                style={styles.access}
                onPress={async () => {
                  await requestHealthConnectAccess();
                  await reload();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.accessText}>
                  Allow past-data access to include all your steps since 1 January.
                </Text>
                <Text style={styles.link}>Allow access</Text>
              </Pressable>
            )}

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

            <StepsBarChart days={shown} goal={stepGoal} />

            <View style={styles.list}>
              <Row
                label={`${range}-day average`}
                value={formatCount(stats.average)}
                delta={
                  <Delta
                    value={previous && stats.average - previous.average}
                    format={formatCount}
                    better="up"
                  />
                }
              />
              <Row
                label="Goal days"
                value={`${stats.goalDays} of ${range}`}
                delta={
                  <Delta value={previous && stats.goalDays - previous.goalDays} format={String} better="up" />
                }
              />
              {stats.best && stats.best.steps > 0 && (
                <Row
                  label="Best day"
                  value={`${formatCount(stats.best.steps)} · ${formatDayMonth(stats.best.date)}`}
                  delta={
                    <Delta
                      value={previous?.best ? stats.best.steps - previous.best.steps : null}
                      format={formatCount}
                      better="up"
                    />
                  }
                />
              )}
              <Row
                label="Distance today"
                value={`≈ ${distanceKm(today).toFixed(1)} km`}
                delta={
                  <Delta
                    value={vsYesterday === null ? null : distanceKm(vsYesterday)}
                    format={(km) => `${km.toFixed(1)} km`}
                    better="up"
                  />
                }
              />
              <Pressable
                style={styles.row}
                onPress={() => router.push('/day-by-day')}
                accessibilityRole="button"
              >
                <Text style={styles.muted}>Day by day · since 1 Jan</Text>
                <Text style={styles.link}>{days.length} days ›</Text>
              </Pressable>
            </View>
            <Text style={styles.note}>
              Average, goal days and best day count full days (today is still going) and are compared with the{' '}
              {range} days before. Today’s numbers are compared with this time yesterday. Distance is an
              estimate from your step count.
            </Text>

            {year && (
              <YearInsights
                insights={year}
                change={yearDelta}
                goal={stepGoal}
                year={new Date().getFullYear()}
                fullAccess={fullAccess}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, delta }: { label: string; value: string; delta?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.value}>{value}</Text>
        {delta}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  error: { fontSize: 16, color: colors.orangeDark },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
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
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  value: { fontSize: 16, fontWeight: '600', color: colors.ink },
  rowRight: { alignItems: 'flex-end' },
  note: { fontSize: 13, color: colors.muted },
  access: { backgroundColor: colors.orangeSoft, borderRadius: radius.pill, padding: 14, gap: 6 },
  accessText: { fontSize: 15, lineHeight: 21, color: '#8A3A0E' },
  link: { fontSize: 15, fontWeight: '700', color: colors.teal },
});
