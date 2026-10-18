import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLabReports } from '../../health/useLabReports';
import { classify, lipidChange, LIPIDS, type LabReport } from '../../lib/cholesterol';
import { formatDate } from '../../lib/dates';
import { formatCount } from '../../lib/format';
import { colors, radius, toneColors } from '../../theme';

export default function LabsScreen() {
  const { reports } = useLabReports();
  const latest = reports?.[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Cholesterol</Text>
          <Pressable style={styles.pill} onPress={() => router.push('/lab-report')} accessibilityRole="button">
            <Text style={styles.pillText}>+ Add</Text>
          </Pressable>
        </View>

        {reports === null && <ActivityIndicator color={colors.teal} />}

        {reports?.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Add your first lab report</Text>
            <Text style={styles.muted}>
              Type in total cholesterol, LDL, HDL and triglycerides from your blood test. Sehat shows what each
              value means and how it changes from test to test.
            </Text>
            <Pressable style={styles.button} onPress={() => router.push('/lab-report')} accessibilityRole="button">
              <Text style={styles.buttonText}>Add lab report</Text>
            </Pressable>
          </View>
        )}

        {latest && reports && (
          <>
            <Text style={styles.muted}>
              {formatDate(latest.date)}
              {latest.lab ? ` · ${latest.lab}` : ''} · mg/dL
            </Text>
            {LIPIDS.map(({ key, name }) => {
              const value = latest[key];
              if (value === null) return null;
              const c = classify(key, value);
              const change = lipidChange(reports, key);
              return (
                <View key={key} style={styles.lipid}>
                  <View>
                    <Text style={styles.lipidName}>{name}</Text>
                    <Text style={[styles.status, { color: toneColors[c.tone] }]}>{c.label}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.value}>{formatCount(value)}</Text>
                    {change && change.delta !== 0 && (
                      <Text style={[styles.change, { color: change.improved ? colors.tealDark : '#8A3A0E' }]}>
                        {change.delta > 0 ? '▲' : '▼'} {formatCount(Math.abs(change.delta))} since last
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            <Text style={styles.section}>All reports</Text>
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
            <Text style={styles.note}>
              Ranges are common adult reference ranges. Your doctor may set different targets for you.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportRow({ report }: { report: LabReport }) {
  const parts = LIPIDS.filter(({ key }) => report[key] !== null).map(
    ({ key, name }) => `${name} ${formatCount(report[key]!)}`,
  );
  return (
    <Pressable
      style={styles.reportRow}
      onPress={() => router.push({ pathname: '/lab-report', params: { id: String(report.id) } })}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.reportDate}>{formatDate(report.date)}</Text>
        <Text style={styles.reportValues}>{parts.join(' · ')}</Text>
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
  muted: { fontSize: 16, lineHeight: 22, color: colors.muted },
  empty: { backgroundColor: colors.tealSoft, borderRadius: radius.card, padding: 20, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  button: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  lipid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lipidName: { fontSize: 17, fontWeight: '600', color: colors.ink },
  status: { fontSize: 15, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  value: { fontSize: 26, fontWeight: '700', color: colors.ink },
  change: { fontSize: 13, fontWeight: '600' },
  section: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 8 },
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
  link: { fontSize: 15, fontWeight: '600', color: colors.teal },
  note: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 8 },
});
