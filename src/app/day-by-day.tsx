import { useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '../db/profile';
import { useSteps } from '../health/useSteps';
import { calendarDaysBetween, formatDate, formatDayHeading, formatDayMonth } from '../lib/dates';
import { formatCount } from '../lib/format';
import { dayByDay, type DayRow } from '../lib/steps';
import { colors, radius } from '../theme';

const ROW_HEIGHT = 48;
const BOUNDARY_HEIGHT = 96;
const UNDER_GOAL = '#F2B48F';

type Item = { kind: 'day'; row: DayRow } | { kind: 'boundary' };

export default function DayByDayScreen() {
  const { status, days, error } = useSteps();
  const { stepGoal } = useProfile().profile;
  const list = useRef<FlatList<Item>>(null);
  const now = new Date();

  const out = useMemo(() => dayByDay(days, stepGoal), [days, stepGoal]);
  const items = useMemo(() => {
    const rows: Item[] = out.rows.map((row) => ({ kind: 'day', row }));
    // The "coverage stops here" box sits between the last covered day and the next one.
    if (out.next) rows.splice(out.coveredDays, 0, { kind: 'boundary' });
    return rows;
  }, [out]);
  const maxSteps = Math.max(stepGoal * 1.2, ...out.rows.map((r) => r.steps));
  const boundaryIndex = out.next ? out.coveredDays : -1;

  if (status === 'loading' && !error) return <ActivityIndicator style={styles.loading} color={colors.teal} />;
  if (status !== 'ready' || out.rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.muted}>{error ?? 'Connect Health Connect on the Steps tab to see your days.'}</Text>
      </View>
    );
  }

  const first = out.rows[out.rows.length - 1].date;
  const oldestCovered = out.coveredDays > 0 ? out.rows[out.coveredDays - 1] : null;

  return (
    <FlatList
      ref={list}
      data={items}
      keyExtractor={(item) => (item.kind === 'boundary' ? 'boundary' : String(item.row.daysBack))}
      contentContainerStyle={styles.content}
      getItemLayout={(_, index) => ({
        length: items[index]?.kind === 'boundary' ? BOUNDARY_HEIGHT : ROW_HEIGHT,
        offset: index * ROW_HEIGHT + (boundaryIndex >= 0 && index > boundaryIndex ? BOUNDARY_HEIGHT - ROW_HEIGHT : 0),
        index,
      })}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={[styles.summary, out.coveredDays === 0 && styles.summaryNone]}>
            <Text style={styles.summaryTitle}>
              {out.coveredDays === 0
                ? 'No retro days yet'
                : `${out.coveredDays} ${out.coveredDays === 1 ? 'day' : 'days'} covered · ${
                    oldestCovered && calendarDaysBetween(oldestCovered.date, now) > 0
                      ? `${formatDayMonth(oldestCovered.date)} to today`
                      : 'today'
                  }`}
            </Text>
            <Text style={styles.summaryBody}>
              {out.coveredDays === 0
                ? `Reach ${formatCount(stepGoal)} steps today to start the retro goal.`
                : `${formatCount(out.coveredSteps)} steps against ${formatCount(out.neededSteps)} needed (${
                    out.coveredDays
                  } × ${formatCount(stepGoal)}).`}
            </Text>
            {out.startDate && out.average !== null && (
              <Text style={styles.summaryBody}>
                Average since you started on {formatDate(out.startDate)}: {formatCount(out.average)} steps a day.
              </Text>
            )}
          </View>
          {boundaryIndex > 0 && (
            <Pressable
              onPress={() => list.current?.scrollToIndex({ index: boundaryIndex, viewPosition: 0.3 })}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Jump to where coverage stops ›</Text>
            </Pressable>
          )}
          <View style={styles.legend}>
            <Legend color={colors.orangeSoft} label="In the retro goal" />
            <Legend color={colors.orangeDark} label={`Hit ${formatCount(stepGoal)}`} />
            <Legend color={UNDER_GOAL} label="Under" />
          </View>
        </View>
      }
      ListFooterComponent={
        <Text style={styles.footer}>
          Started {formatDayMonth(first)} · {out.rows.length} days
        </Text>
      }
      renderItem={({ item, index }) => {
        if (item.kind === 'boundary') {
          const next = out.next!;
          return (
            <View style={styles.boundary}>
              <Text style={styles.boundaryTitle}>Coverage stops here</Text>
              <Text style={styles.boundaryBody}>
                {formatDayHeading(next.row.date)} had {formatCount(next.row.steps)} steps.{' '}
                {formatCount(next.stepsNeeded)} more steps today would cover it.
              </Text>
            </View>
          );
        }
        const { row } = item;
        const isToday = row.daysBack === 1;
        const lastCovered = row.covered && row.daysBack === out.coveredDays;
        const firstCovered = row.covered && row.daysBack === 1;
        return (
          <View
            style={[
              styles.day,
              row.covered && styles.covered,
              firstCovered && styles.coveredTop,
              lastCovered && styles.coveredBottom,
            ]}
          >
            <Text style={styles.back}>{row.covered ? row.daysBack : ''}</Text>
            <View style={styles.date}>
              <Text style={[styles.dateText, row.covered && styles.coveredText]} numberOfLines={1}>
                {isToday ? 'Today' : formatDayHeading(row.date)}
              </Text>
              {isToday && <Text style={[styles.sub, row.covered && styles.coveredText]}>so far</Text>}
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(100, (row.steps / maxSteps) * 100)}%`,
                    backgroundColor: row.steps >= stepGoal ? colors.orangeDark : UNDER_GOAL,
                  },
                ]}
              />
              <View style={[styles.goalTick, { left: `${(stepGoal / maxSteps) * 100}%` }]} />
            </View>
            <Text style={styles.steps}>{formatCount(row.steps)}</Text>
          </View>
        );
      }}
      onScrollToIndexFailed={() => {}}
    />
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  empty: { flex: 1, padding: 24 },
  muted: { fontSize: 16, color: colors.muted },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { gap: 12, paddingBottom: 10 },
  summary: { backgroundColor: colors.orangeSoft, borderRadius: radius.pill, padding: 14, gap: 2 },
  summaryNone: { backgroundColor: colors.card },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#8A3A0E' },
  summaryBody: { fontSize: 14, color: '#8A3A0E' },
  link: { fontSize: 15, fontWeight: '700', color: colors.teal },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.muted },
  day: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  covered: { backgroundColor: colors.orangeSoft },
  coveredTop: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  coveredBottom: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  coveredText: { color: '#8A3A0E' },
  back: { width: 22, textAlign: 'right', fontSize: 11, fontVariant: ['tabular-nums'], color: '#8A3A0E' },
  date: { width: 92 },
  dateText: { fontSize: 13, fontWeight: '500', color: colors.ink },
  sub: { fontSize: 11, color: colors.muted },
  track: { flex: 1, height: 10, justifyContent: 'center' },
  fill: { height: 10, borderRadius: 5 },
  goalTick: { position: 'absolute', top: -3, bottom: -3, width: 1.5, backgroundColor: colors.muted, opacity: 0.6 },
  steps: { width: 56, textAlign: 'right', fontSize: 14, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  boundary: {
    height: BOUNDARY_HEIGHT - 16,
    justifyContent: 'center',
    gap: 2,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.orangeDark,
    borderRadius: radius.pill,
  },
  boundaryTitle: { fontSize: 14, fontWeight: '700', color: colors.orangeDark },
  boundaryBody: { fontSize: 13, lineHeight: 18, color: colors.orangeDark },
  footer: { textAlign: 'center', fontSize: 13, color: colors.muted, paddingVertical: 14 },
});
