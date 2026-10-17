import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectCard } from '../components/ConnectCard';
import { StepsRing } from '../components/StepsRing';
import { DAILY_STEP_GOAL } from '../config';
import { useTodayHealth } from '../health/useTodayHealth';
import { formatDayHeading, formatRelativeDay, greetingFor } from '../lib/dates';
import { formatCount, formatKg, percentOfGoal } from '../lib/format';
import { colors, radius } from '../theme';

export default function TodayScreen() {
  const { status, steps, weight, error, refreshing, refresh, connect } = useTodayHealth();
  const now = new Date();
  const stepsPercent = percentOfGoal(steps ?? 0, DAILY_STEP_GOAL);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View>
          <Text style={styles.date}>{formatDayHeading(now)}</Text>
          <Text style={styles.greeting}>{greetingFor(now)}</Text>
        </View>

        {status === 'loading' && !error && <ActivityIndicator color={colors.teal} />}

        {error && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.muted}>Pull down to try again.</Text>
          </View>
        )}

        {status !== 'loading' && status !== 'ready' && (
          <ConnectCard status={status} onConnect={connect} />
        )}

        {status === 'ready' && (
          <>
            <View style={[styles.card, styles.row]}>
              <StepsRing percent={stepsPercent} />
              <View>
                <Text style={styles.bigNumber}>{formatCount(steps ?? 0)}</Text>
                <Text style={styles.muted}>of {formatCount(DAILY_STEP_GOAL)} steps</Text>
                <Text style={styles.stepsPercent}>{stepsPercent}% of goal</Text>
              </View>
            </View>

            <View style={[styles.card, styles.rowBetween]}>
              <View>
                <Text style={styles.muted}>Weight</Text>
                <Text style={styles.muted}>
                  {weight ? formatRelativeDay(weight.time, now) : 'No weigh-ins yet'}
                </Text>
              </View>
              <Text style={styles.value}>{weight ? `${formatKg(weight.kg)} kg` : '–'}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  date: { fontSize: 16, color: colors.muted },
  greeting: { fontSize: 28, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigNumber: { fontSize: 32, fontWeight: '700', color: colors.ink },
  value: { fontSize: 24, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 16, color: colors.muted },
  stepsPercent: { fontSize: 16, fontWeight: '600', color: colors.orangeDark },
  errorCard: { backgroundColor: colors.orangeSoft, gap: 4 },
  errorText: { fontSize: 16, fontWeight: '600', color: colors.orangeDark },
});
