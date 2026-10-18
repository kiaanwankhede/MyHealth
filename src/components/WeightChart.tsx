import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { addDays, calendarDaysBetween, formatDayMonth, startOfLocalDay } from '../lib/dates';
import type { Goal, GoalProgress, TrendPoint } from '../lib/goal';
import { colors } from '../theme';

type Props = {
  series: readonly TrendPoint[];
  goal: Goal | null;
  progress: GoalProgress | null;
  today: Date;
  height?: number;
};

const PAD = 12;

/**
 * Daily weigh-ins (dots), smoothed trend (solid), and — with a goal — the straight plan
 * line from start to target (dashed) plus a projection at the measured pace (dotted).
 */
export function WeightChart({ series, goal, progress, today, height = 200 }: Props) {
  const [width, setWidth] = useState(0);
  const day = startOfLocalDay(today);

  const start = goal ? goal.startDate : (series[0]?.date ?? addDays(day, -90));
  const points = series.filter((p) => calendarDaysBetween(start, p.date) >= 0);
  let end = goal && goal.targetDate > day ? goal.targetDate : day;
  if (calendarDaysBetween(start, end) < 1) end = addDays(start, 1);
  const spanDays = calendarDaysBetween(start, end);

  // Projection from today's trend at the measured pace, until the goal or the chart's end.
  let projection: { from: Date; fromKg: number; to: Date; toKg: number } | null = null;
  if (goal && progress && !progress.reached && progress.paceKgPerWeek && progress.paceKgPerWeek > 0) {
    const to = progress.projectedFinish && progress.projectedFinish < end ? progress.projectedFinish : end;
    const days = calendarDaysBetween(day, to);
    if (days > 0) {
      projection = {
        from: day,
        fromKg: progress.trendKg,
        to,
        toKg: progress.trendKg - (progress.paceKgPerWeek / 7) * days,
      };
    }
  }

  const values = points.flatMap((p) => [p.kg, p.trend]);
  if (goal) values.push(goal.startKg, goal.targetKg);
  if (projection) values.push(projection.toKg);
  const yMin = values.length ? Math.floor(Math.min(...values) - 0.5) : 0;
  const yMax = values.length ? Math.ceil(Math.max(...values) + 0.5) : 1;

  const x = (d: Date) => PAD + (calendarDaysBetween(start, d) / spanDays) * (width - 2 * PAD);
  const y = (kg: number) => PAD + ((yMax - kg) / (yMax - yMin)) * (height - 2 * PAD);

  const trendPoints = points.map((p) => `${x(p.date).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  const todayX = x(day);

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel="Weight chart"
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            <Rect x={0} y={0} width={width} height={height} rx={16} fill={colors.card} />
            {todayX < width - PAD && (
              <Line x1={todayX} y1={PAD / 2} x2={todayX} y2={height - PAD / 2} stroke="#C9D4C8" strokeWidth={2} />
            )}
            {goal && (
              <Line
                x1={x(goal.startDate)}
                y1={y(goal.startKg)}
                x2={x(goal.targetDate)}
                y2={y(goal.targetKg)}
                stroke={colors.muted}
                strokeWidth={2}
                strokeDasharray="8 6"
              />
            )}
            {projection && (
              <Line
                x1={x(projection.from)}
                y1={y(projection.fromKg)}
                x2={x(projection.to)}
                y2={y(projection.toKg)}
                stroke={colors.orange}
                strokeWidth={3}
                strokeDasharray="2 6"
                strokeLinecap="round"
              />
            )}
            {points.map((p) => (
              <Circle key={p.date.getTime()} cx={x(p.date)} cy={y(p.kg)} r={3} fill="#8FA9A2" />
            ))}
            {points.length > 1 && (
              <Polyline
                points={trendPoints}
                fill="none"
                stroke={colors.teal}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {goal && (
              <Circle
                cx={x(goal.targetDate)}
                cy={y(goal.targetKg)}
                r={7}
                fill={colors.surface}
                stroke={colors.teal}
                strokeWidth={3}
              />
            )}
          </Svg>
        )}
        <Text style={[styles.axis, styles.top]}>{yMax} kg</Text>
        <Text style={[styles.axis, styles.bottom]}>{yMin} kg</Text>
      </View>
      <View style={styles.dates}>
        <Text style={styles.axisText}>{formatDayMonth(start)}</Text>
        <Text style={styles.axisText}>{formatDayMonth(end)}</Text>
      </View>
      <Text style={styles.legend}>
        <Text style={{ color: colors.teal }}>━ Trend</Text>
        {'   '}
        <Text style={{ color: '#5F7A72' }}>● Daily</Text>
        {goal ? (
          <>
            {'   '}
            <Text style={{ color: colors.muted }}>╌ Plan</Text>
          </>
        ) : null}
        {projection ? (
          <>
            {'   '}
            <Text style={{ color: colors.orangeDark }}>┈ Projected</Text>
          </>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { position: 'absolute', left: 14, fontSize: 12, color: colors.muted },
  top: { top: 4 },
  bottom: { bottom: 4 },
  dates: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  axisText: { fontSize: 12, color: colors.muted },
  legend: { fontSize: 13, fontWeight: '600', marginTop: 6 },
});
