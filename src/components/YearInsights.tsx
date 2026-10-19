import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Delta } from './Delta';

import { formatDayMonth } from '../lib/dates';
import { formatCount } from '../lib/format';
import type { YearInsights as Insights, YearChange } from '../lib/steps';
import { colors, radius } from '../theme';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_HEIGHT = 110;

type Props = {
  insights: Insights;
  change: YearChange | null;
  goal: number;
  year: number;
  fullAccess: boolean;
};

export function YearInsights({ insights: y, change: c, goal, year, fullAccess }: Props) {
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
        <Tile
          label="Total steps"
          value={formatCount(y.total)}
          delta={c && <Delta value={c.total} format={formatCount} better="up" suffix="this week" />}
        />
        <Tile
          label="Daily average"
          value={formatCount(y.average)}
          delta={c && <Delta value={c.average} format={formatCount} better="up" suffix="this week" />}
        />
        <Tile
          label="Goal days"
          value={`${y.goalDays} · ${y.goalRate}%`}
          delta={c && <Delta value={c.goalDays} format={String} better="up" suffix="this week" />}
        />
        <Tile
          label="Distance"
          value={`≈ ${formatCount(y.distanceKm)} km`}
          delta={
            c && (
              <Delta
                value={c.distanceKm}
                format={(km) => `${formatCount(km)} km`}
                better="up"
                suffix="this week"
              />
            )
          }
        />
        <Tile
          label="Best day"
          value={`${formatCount(y.best.steps)}`}
          sub={formatDayMonth(y.best.date)}
          delta={c?.newBest ? <Text style={styles.newBest}>New this week</Text> : null}
        />
        <Tile
          label="Longest streak"
          value={`${y.longestStreak.days} ${y.longestStreak.days === 1 ? 'day' : 'days'}`}
          sub={y.longestStreak.end ? `ended ${formatDayMonth(y.longestStreak.end)}` : undefined}
          delta={
            c && c.longestStreak > 0 ? (
              <Delta value={c.longestStreak} format={String} better="up" suffix="this week" />
            ) : null
          }
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

type TileProps = { label: string; value: string; sub?: string; delta?: ReactNode };

function Tile({ label, value, sub, delta }: TileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {sub && <Text style={styles.tileSub}>{sub}</Text>}
      {delta}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  note: { fontSize: 14, lineHeight: 20, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 12,
  },
  tileLabel: { fontSize: 14, color: colors.muted },
  tileValue: { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 2 },
  tileSub: { fontSize: 13, color: colors.muted },
  newBest: { fontSize: 14, fontWeight: '600', color: colors.tealDark },
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
  weekday: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 8,
  },
  weekdayTop: { backgroundColor: colors.orangeSoft },
  weekdayName: { fontSize: 12, color: colors.muted },
  weekdayValue: { fontSize: 14, fontWeight: '700', color: colors.ink },
});
