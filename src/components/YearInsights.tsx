import { StyleSheet, Text, View } from 'react-native';

import { formatDayMonth } from '../lib/dates';
import { formatCount } from '../lib/format';
import type { YearInsights as Insights } from '../lib/steps';
import { colors, radius } from '../theme';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_HEIGHT = 110;

type Props = { insights: Insights; goal: number; year: number; fullAccess: boolean };

export function YearInsights({ insights: y, goal, year, fullAccess }: Props) {
  const startsLate = y.from.getMonth() !== 0 || y.from.getDate() !== 1;
  const maxMonthly = Math.max(goal, ...y.monthly.map((m) => m.average));
  const weekdayValues = y.weekdays.filter((v): v is number => v !== null);
  const topDay = weekdayValues.length ? y.weekdays.indexOf(Math.max(...weekdayValues)) : -1;
  const lowDay = weekdayValues.length ? y.weekdays.indexOf(Math.min(...weekdayValues)) : -1;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{year} so far</Text>
      {startsLate && (
        <Text style={styles.note}>
          Counting from {formatDayMonth(y.from)}, the first day with steps.
          {!fullAccess && ' Allow past-data access in Health Connect to include older steps.'}
        </Text>
      )}

      <View style={styles.grid}>
        <Tile label="Total steps" value={formatCount(y.total)} />
        <Tile label="Daily average" value={formatCount(y.average)} />
        <Tile label="Goal days" value={`${y.goalDays} · ${y.goalRate}%`} />
        <Tile label="Distance" value={`≈ ${formatCount(y.distanceKm)} km`} />
        <Tile label="Best day" value={`${formatCount(y.best.steps)}`} sub={formatDayMonth(y.best.date)} />
        <Tile
          label="Longest streak"
          value={`${y.longestStreak.days} ${y.longestStreak.days === 1 ? 'day' : 'days'}`}
          sub={y.longestStreak.end ? `ended ${formatDayMonth(y.longestStreak.end)}` : undefined}
        />
      </View>
      {y.currentStreak > 1 && (
        <Text style={styles.streak}>🔥 {y.currentStreak} goal days in a row right now</Text>
      )}

      <Text style={styles.section}>Average per day, by month</Text>
      <View style={styles.chart} accessibilityLabel="Average daily steps by month">
        {MONTHS.map((letter, month) => {
          const m = y.monthly.find((x) => x.month === month);
          const h = m ? Math.max(2, (m.average / maxMonthly) * CHART_HEIGHT) : 0;
          return (
            <View key={month} style={styles.col}>
              <Text style={styles.colValue}>{m ? `${Math.round(m.average / 1000)}k` : ''}</Text>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: m && m.average >= goal ? colors.orangeDark : '#F0B48A' },
                ]}
              />
              <Text style={styles.colLabel}>{letter}</Text>
            </View>
          );
        })}
        <View
          style={[styles.goalLine, { bottom: 18 + (goal / maxMonthly) * CHART_HEIGHT }]}
          pointerEvents="none"
        />
      </View>

      <Text style={styles.section}>Average by weekday</Text>
      <View style={styles.weekdays}>
        {WEEKDAYS.map((name, i) => (
          <View key={name} style={[styles.weekday, i === topDay && styles.weekdayTop]}>
            <Text style={styles.weekdayName}>{name}</Text>
            <Text style={styles.weekdayValue}>
              {y.weekdays[i] === null ? '–' : `${(y.weekdays[i]! / 1000).toFixed(1)}k`}
            </Text>
          </View>
        ))}
      </View>
      {topDay >= 0 && lowDay >= 0 && topDay !== lowDay && (
        <Text style={styles.note}>
          You walk most on {WEEKDAYS[topDay]}s and least on {WEEKDAYS[lowDay]}s.
        </Text>
      )}
    </View>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {sub && <Text style={styles.tileSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  note: { fontSize: 14, lineHeight: 20, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.pill, padding: 12 },
  tileLabel: { fontSize: 14, color: colors.muted },
  tileValue: { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 2 },
  tileSub: { fontSize: 13, color: colors.muted },
  streak: { fontSize: 15, fontWeight: '600', color: colors.orangeDark },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 6 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 40 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  colValue: { fontSize: 10, color: colors.muted, marginBottom: 2 },
  bar: { width: '60%', borderRadius: 4 },
  colLabel: { fontSize: 12, color: colors.muted, marginTop: 4, height: 14 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ink,
  },
  weekdays: { flexDirection: 'row', gap: 4 },
  weekday: { flex: 1, alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, paddingVertical: 8 },
  weekdayTop: { backgroundColor: colors.orangeSoft },
  weekdayName: { fontSize: 12, color: colors.muted },
  weekdayValue: { fontSize: 14, fontWeight: '700', color: colors.ink },
});
