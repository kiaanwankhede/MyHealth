import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '../db/profile';
import { useWaist } from '../health/useWaist';
import {
  bmi,
  classifyBmi,
  classifyWaist,
  classifyWaistToHeight,
  healthyWeightRange,
  waistToHeight,
} from '../lib/body';
import { addDays, formatDate } from '../lib/dates';
import type { TrendPoint } from '../lib/goal';
import type { Classification } from '../lib/labs';
import { trendOn } from '../lib/review';
import { Delta } from './Delta';
import { formatKg } from '../lib/format';
import { colors, radius, toneColors } from '../theme';

/** BMI, waist and waist-to-height with Asian Indian cut-offs, on the Weight tab. */
export function BodyCard({ series }: { series: readonly TrendPoint[] }) {
  const { profile } = useProfile();
  const { entries } = useWaist();
  const height = profile.heightCm;
  const waist = entries?.[0] ?? null;
  const previousWaist = entries?.[1] ?? null;
  const trendKg = series.length ? series[series.length - 1].trend : null;
  const monthAgoKg = trendOn(series, addDays(new Date(), -30));

  const value = height !== null && trendKg !== null ? bmi(trendKg, height) : null;
  const bmiChange = value !== null && monthAgoKg !== null ? value - bmi(monthAgoKg, height!) : null;
  const range = height !== null ? healthyWeightRange(height) : null;
  const waistStatus = waist ? classifyWaist(waist.cm, profile.sex) : null;
  const ratio = waist && height !== null ? waistToHeight(waist.cm, height) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Body</Text>
        <Pressable style={styles.pill} onPress={() => router.push('/log-waist')} accessibilityRole="button">
          <Text style={styles.pillText}>+ Waist</Text>
        </Pressable>
      </View>

      {height === null ? (
        <Pressable style={styles.card} onPress={() => router.push('/profile')} accessibilityRole="button">
          <Text style={styles.muted}>Add your height to see your BMI and healthy weight range.</Text>
          <Text style={styles.link}>Add height</Text>
        </Pressable>
      ) : (
        <View style={styles.card}>
          <Row
            label="BMI (from trend)"
            value={value === null ? '–' : value.toFixed(1)}
            status={value === null ? null : classifyBmi(value)}
            delta={<Delta value={bmiChange} format={(v) => v.toFixed(1)} better="down" suffix="in 30 days" />}
          />
          {range && (
            <Text style={styles.muted}>
              Healthy for your height: {formatKg(range.min)}–{formatKg(range.max)} kg
            </Text>
          )}
        </View>
      )}

      {waist ? (
        <View style={styles.card}>
          <Row
            label={`Waist · ${formatDate(waist.date)}`}
            value={`${formatKg(waist.cm)} cm`}
            status={waistStatus}
          />
          {ratio !== null && (
            <Row label="Waist ÷ height" value={ratio.toFixed(2)} status={classifyWaistToHeight(ratio)} />
          )}
          {profile.sex === null && (
            <Pressable onPress={() => router.push('/profile')} accessibilityRole="button">
              <Text style={styles.muted}>
                <Text style={styles.link}>Add your sex</Text> to see whether your waist is in the healthy
                range.
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Text style={styles.muted}>
          Waist size shows belly fat better than BMI. Measure it about once a month with “+ Waist”.
        </Text>
      )}

      <Text style={styles.note}>
        Cut-offs for Asian Indians: overweight from BMI 23, obese from 25; waist 90 cm or more (men) or 80 cm
        or more (women); waist under half your height.
      </Text>
    </View>
  );
}

type RowProps = { label: string; value: string; status: Classification | null; delta?: ReactNode };

function Row({ label, value, status, delta }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {status && <Text style={[styles.status, { color: toneColors[status.tone] }]}>{status.label}</Text>}
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>{value}</Text>
        {delta}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  pill: { backgroundColor: colors.teal, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.pill, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15, color: colors.muted },
  status: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  value: { fontSize: 22, fontWeight: '700', color: colors.ink },
  right: { alignItems: 'flex-end' },
  muted: { fontSize: 15, lineHeight: 21, color: colors.muted },
  link: { fontSize: 15, fontWeight: '600', color: colors.teal },
  note: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
