import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { formatDayMonth } from '../lib/dates';
import { formatCount } from '../lib/format';
import type { DailySteps } from '../lib/steps';
import { colors } from '../theme';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PAD_TOP = 18;

type Props = { days: readonly DailySteps[]; goal: number; height?: number };

/**
 * One bar per day, oldest left. Dark bars met the goal, light bars didn't, and the last
 * bar (today) is mid-tone because it's still filling. The dashed line is the goal.
 */
export function StepsBarChart({ days, goal, height = 180 }: Props) {
  const [width, setWidth] = useState(0);
  const max = Math.max(goal * 1.2, ...days.map((d) => d.steps));
  const slot = days.length ? width / days.length : 0;
  const barWidth = Math.max(2, slot * (days.length > 10 ? 0.7 : 0.6));
  const y = (steps: number) => PAD_TOP + (1 - steps / max) * (height - PAD_TOP);
  const goalY = y(goal);
  const weekView = days.length <= 7;

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={`Steps per day for the last ${days.length} days`}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            {days.map((d, i) => {
              const isToday = i === days.length - 1;
              const fill = isToday ? colors.orange : d.steps >= goal ? colors.orangeDark : '#F0B48A';
              const top = y(d.steps);
              return (
                <Rect
                  key={d.date.getTime()}
                  x={i * slot + (slot - barWidth) / 2}
                  y={top}
                  width={barWidth}
                  height={Math.max(0, height - top)}
                  rx={Math.min(6, barWidth / 2)}
                  fill={fill}
                />
              );
            })}
            <Line x1={0} y1={goalY} x2={width} y2={goalY} stroke={colors.ink} strokeWidth={1.5} strokeDasharray="6 5" />
          </Svg>
        )}
        <Text style={[styles.goalLabel, { top: Math.max(0, goalY - 18) }]}>{formatCount(goal)}</Text>
      </View>
      {weekView ? (
        <View style={styles.row}>
          {days.map((d, i) => (
            <Text key={d.date.getTime()} style={[styles.day, i === days.length - 1 && styles.today]}>
              {WEEKDAY_LETTERS[d.date.getDay()]}
            </Text>
          ))}
        </View>
      ) : (
        days.length > 0 && (
          <View style={styles.ends}>
            <Text style={styles.axis}>{formatDayMonth(days[0].date)}</Text>
            <Text style={styles.axis}>Today</Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  goalLabel: { position: 'absolute', right: 0, fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', marginTop: 6 },
  day: { flex: 1, textAlign: 'center', fontSize: 14, color: colors.muted },
  today: { fontWeight: '700', color: colors.ink },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axis: { fontSize: 12, color: colors.muted },
});
