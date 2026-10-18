import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { listLabReports, listMedicines, listWaist } from '../db/database';
import { useProfile } from '../db/profile';
import {
  getHealthConnectStatus,
  getWatchAccess,
  readDailySteps,
  readRestingHeartRate,
  readSleepSessions,
  readWeightHistory,
} from '../health/healthConnect';
import { addDays, startOfLocalDay } from '../lib/dates';
import { dailyAverages, trendSeries } from '../lib/goal';
import { nights, restingHeartSummary, sleepSummary } from '../lib/sleep';
import { summaryHtml, type SummaryData } from '../lib/summary';
import { colors, radius } from '../theme';

/** The chart covers this many days; the trend reads a month more so it starts settled. */
const CHART_DAYS = 180;
const STEP_DAYS = 30;

export default function SummaryScreen() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gather = async (): Promise<SummaryData> => {
    const now = new Date();
    const [reports, medicines, waist] = await Promise.all([
      listLabReports(db),
      listMedicines(db),
      listWaist(db),
    ]);
    const data: SummaryData = {
      now,
      profile,
      series: [],
      waist: waist[0] ?? null,
      steps: { average: null, days: STEP_DAYS },
      sleep: null,
      heart: null,
      reports,
      medicines,
    };
    if ((await getHealthConnectStatus()) !== 'ready') return data;

    const chartFrom = addDays(startOfLocalDay(now), -CHART_DAYS);
    const [weights, steps, access] = await Promise.all([
      readWeightHistory(addDays(chartFrom, -30), now),
      readDailySteps(STEP_DAYS + 1, now),
      getWatchAccess(),
    ]);
    data.series = trendSeries(dailyAverages(weights)).filter((p) => p.date >= chartFrom);
    const complete = steps.slice(0, -1).filter((d) => d.steps > 0);
    data.steps = {
      average: complete.length
        ? Math.round(complete.reduce((s, d) => s + d.steps, 0) / complete.length)
        : null,
      days: complete.length,
    };
    const weekAgo = addDays(startOfLocalDay(now), -8);
    if (access.sleep) data.sleep = sleepSummary(nights(await readSleepSessions(weekAgo, now)), now);
    if (access.heart) data.heart = restingHeartSummary(await readRestingHeartRate(weekAgo, now), now);
    return data;
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { uri } = await Print.printToFileAsync({ html: summaryHtml(await gather()) });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share health summary' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the summary.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.body}>
        A one-page PDF for your doctor: weight trend with a 6-month chart, BMI and waist, average steps, sleep
        and resting heart rate, every lab result with its previous value, and your medicines.
      </Text>
      <Text style={styles.note}>
        It is made on this phone. Share it on WhatsApp or email, save it to Drive, or print it.
      </Text>
      <Pressable
        style={[styles.button, busy && styles.disabled]}
        onPress={create}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{busy ? 'Preparing…' : 'Create PDF'}</Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  note: { fontSize: 14, lineHeight: 20, color: colors.muted },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
  error: { fontSize: 15, color: colors.orangeDark },
});
