import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { describeRetro, type RetroGoal } from '../lib/steps';
import { colors, radius } from '../theme';

/** Today's goal first, then "cover yesterday too", then 3 days, and so on. */
export function RetroGoalCard({ retro }: { retro: RetroGoal }) {
  const covered = retro.state === 'today' ? 0 : retro.coveredDays;
  return (
    <View style={[styles.card, covered > 0 && styles.done]}>
      <View style={styles.header}>
        <Text style={styles.title}>Retro goal</Text>
        {covered > 0 && (
          <Text style={styles.badge}>
            {covered} {covered === 1 ? 'day' : 'days'}
          </Text>
        )}
      </View>
      <Text style={styles.body}>{describeRetro(retro)}</Text>
      {covered > 0 && (
        <Pressable onPress={() => router.push('/day-by-day')} accessibilityRole="button">
          <Text style={styles.link}>See which days ›</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, gap: 6 },
  done: { backgroundColor: colors.orangeSoft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  badge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
    backgroundColor: colors.orangeDark,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  body: { fontSize: 15, lineHeight: 21, color: '#5A2A0B' },
  link: { fontSize: 15, fontWeight: '700', color: colors.teal, paddingTop: 2 },
});
