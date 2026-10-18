import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '../../db/profile';
import { useLabReports } from '../../health/useLabReports';
import { formatDate } from '../../lib/dates';
import { formatCount } from '../../lib/format';
import {
  classify,
  classifyBp,
  classifyEgfr,
  classifyNonHdl,
  egfr,
  formatLabValue,
  GROUPS,
  latest,
  nonHdl,
  retestsDue,
  shouldSuggestLpa,
  testsIn,
  testSpec,
  valueChange,
  type Classification,
  type GroupKey,
  type LabContext,
  type LabReport,
  type TestKey,
} from '../../lib/labs';
import { ageOn, HEART_RISK_LABELS, ldlTarget } from '../../lib/profile';
import { colors, radius, toneColors } from '../../theme';

export default function LabsScreen() {
  const { reports } = useLabReports();
  const { profile } = useProfile();
  const now = new Date();
  const ctx: LabContext = { heartRisk: profile.heartRisk, sex: profile.sex, age: ageOn(profile, now) };
  const target = ldlTarget(profile.heartRisk);
  const due = reports ? retestsDue(reports, now) : [];
  const groups = GROUPS.filter((g) =>
    reports?.some((r) => testsIn(g.key).some((t) => r.values[t.key] !== undefined)),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Labs</Text>
          <Pressable
            style={styles.pill}
            onPress={() => router.push('/lab-report')}
            accessibilityRole="button"
          >
            <Text style={styles.pillText}>+ Add</Text>
          </Pressable>
        </View>

        {reports === null && <ActivityIndicator color={colors.teal} />}

        {reports?.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Add your first lab report</Text>
            <Text style={styles.muted}>
              Type in cholesterol, blood sugar, thyroid, vitamins, kidney or blood pressure from your report.
              Sehat shows what each value means and how it changes from test to test.
            </Text>
            <Pressable
              style={styles.button}
              onPress={() => router.push('/lab-report')}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Add lab report</Text>
            </Pressable>
          </View>
        )}

        {reports && reports.length > 0 && (
          <>
            {due.length > 0 && (
              <View style={styles.due}>
                {due.map((d) => (
                  <Text key={d.group} style={styles.dueText}>
                    {d.name} test due · last on {formatDate(d.last)}
                  </Text>
                ))}
              </View>
            )}

            <Pressable onPress={() => router.push('/profile')} accessibilityRole="button">
              <Text style={styles.muted}>
                {target === null ? (
                  <>
                    Using general ranges. <Text style={styles.link}>Set your heart-risk level</Text> for a
                    personal LDL target.
                  </>
                ) : (
                  <>
                    Your LDL target: under {target} mg/dL (
                    {HEART_RISK_LABELS[profile.heartRisk].toLowerCase()} risk).{' '}
                    <Text style={styles.link}>Change</Text>
                  </>
                )}
              </Text>
            </Pressable>

            {groups.map((g) => (
              <View key={g.key} style={styles.group}>
                <Text style={styles.section}>{g.name}</Text>
                <GroupRows group={g.key} reports={reports} ctx={ctx} />
              </View>
            ))}

            {shouldSuggestLpa(reports) && (
              <View style={styles.tip}>
                <Text style={styles.tipTitle}>Consider an Lp(a) test once</Text>
                <Text style={styles.muted}>
                  Lp(a) is an inherited cholesterol particle that raises heart risk and is common in South
                  Asians. One test in a lifetime is usually enough. Ask your doctor.
                </Text>
              </View>
            )}

            <Text style={styles.section}>All reports</Text>
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
            <Text style={styles.note}>
              Ranges are common adult reference ranges (blood pressure: Indian Society of Hypertension). Your
              doctor may set different targets for you.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupRows({ group, reports, ctx }: { group: GroupKey; reports: LabReport[]; ctx: LabContext }) {
  if (group === 'bp') {
    const bp = reports.find((r) => r.values.systolic !== undefined && r.values.diastolic !== undefined);
    if (!bp) return null;
    const { systolic, diastolic } = bp.values as { systolic: number; diastolic: number };
    return (
      <ValueRow
        name="Blood pressure"
        value={`${systolic}/${diastolic}`}
        unit="mmHg"
        status={classifyBp(systolic, diastolic)}
        date={bp.date}
        change={null}
      />
    );
  }

  const rows = testsIn(group)
    .filter((t) => latest(reports, t.key) !== null)
    .map((t) => <TestRow key={t.key} test={t.key} reports={reports} ctx={ctx} />);

  if (group === 'lipids') {
    const withBoth = reports.find((r) => nonHdl(r.values) !== null);
    if (withBoth) {
      const value = nonHdl(withBoth.values)!;
      rows.splice(
        Math.min(3, rows.length),
        0,
        <ValueRow
          key="non-hdl"
          name="Non-HDL (total − HDL)"
          value={formatCount(value)}
          unit="mg/dL"
          status={classifyNonHdl(value, ctx)}
          date={withBoth.date}
          change={null}
        />,
      );
    }
  }

  if (group === 'kidney' && ctx.age !== null && ctx.sex !== null) {
    const creatinine = latest(reports, 'creatinine');
    if (creatinine) {
      const value = egfr(creatinine.value, ctx.age, ctx.sex);
      rows.push(
        <ValueRow
          key="egfr"
          name="eGFR (kidney filtration)"
          value={formatCount(value)}
          unit="mL/min"
          status={classifyEgfr(value)}
          date={creatinine.date}
          change={null}
        />,
      );
    }
  }
  return <>{rows}</>;
}

function TestRow({ test, reports, ctx }: { test: TestKey; reports: LabReport[]; ctx: LabContext }) {
  const reading = latest(reports, test)!;
  const spec = testSpec(test);
  const change = valueChange(reports, test);
  return (
    <ValueRow
      name={spec.name}
      value={formatLabValue(test, reading.value)}
      unit={spec.unit}
      // Creatinine is judged through eGFR when age and sex are known, shown on its own row.
      status={
        test === 'creatinine' && ctx.age !== null && ctx.sex !== null
          ? null
          : classify(test, reading.value, ctx)
      }
      date={reading.date}
      change={
        change && change.delta !== 0
          ? {
              text: `${change.delta > 0 ? '▲' : '▼'} ${formatLabValue(test, Math.abs(change.delta))}`,
              improved: change.improved,
            }
          : null
      }
    />
  );
}

type ValueRowProps = {
  name: string;
  value: string;
  unit: string;
  status: Classification | null;
  date: Date;
  change: { text: string; improved: boolean | null } | null;
};

function ValueRow({ name, value, unit, status, date, change }: ValueRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowName}>{name}</Text>
        {status && <Text style={[styles.status, { color: toneColors[status.tone] }]}>{status.label}</Text>}
        <Text style={styles.rowDate}>{formatDate(date)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>
          {value} <Text style={styles.unit}>{unit}</Text>
        </Text>
        {change && (
          <Text
            style={[
              styles.change,
              {
                color:
                  change.improved === null ? colors.muted : change.improved ? colors.tealDark : '#8A3A0E',
              },
            ]}
          >
            {change.text} since last
          </Text>
        )}
      </View>
    </View>
  );
}

function ReportRow({ report }: { report: LabReport }) {
  const names = GROUPS.filter((g) => testsIn(g.key).some((t) => report.values[t.key] !== undefined)).map(
    (g) => g.name,
  );
  return (
    <Pressable
      style={styles.reportRow}
      onPress={() => router.push({ pathname: '/lab-report', params: { id: String(report.id) } })}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.reportDate}>
          {formatDate(report.date)}
          {report.lab ? ` · ${report.lab}` : ''}
        </Text>
        <Text style={styles.reportValues}>{names.join(' · ')}</Text>
      </View>
      <Text style={styles.link}>Edit</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  pill: { backgroundColor: colors.teal, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  pillText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  pillOutline: {
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pillOutlineText: { color: colors.teal, fontSize: 16, fontWeight: '600' },
  center: { textAlign: 'center', fontSize: 15 },
  muted: { fontSize: 15, lineHeight: 21, color: colors.muted },
  link: { fontWeight: '600', color: colors.teal },
  empty: { backgroundColor: colors.tealSoft, borderRadius: radius.card, padding: 20, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  due: { backgroundColor: colors.orangeSoft, borderRadius: radius.pill, padding: 14, gap: 4 },
  dueText: { fontSize: 15, fontWeight: '600', color: '#8A3A0E' },
  group: { gap: 8 },
  section: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLeft: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: colors.ink },
  status: { fontSize: 15, marginTop: 2 },
  rowDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  value: { fontSize: 22, fontWeight: '700', color: colors.ink },
  unit: { fontSize: 13, fontWeight: '400', color: colors.muted },
  change: { fontSize: 13, fontWeight: '600' },
  tip: { backgroundColor: colors.tealSoft, borderRadius: radius.pill, padding: 14, gap: 6 },
  tipTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reportDate: { fontSize: 16, fontWeight: '600', color: colors.ink },
  reportValues: { fontSize: 14, color: colors.muted, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 8 },
});
