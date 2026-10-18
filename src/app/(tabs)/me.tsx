import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '../../db/profile';
import { useWatchData } from '../../health/useWatchData';
import { formatCount } from '../../lib/format';
import { HEART_RISK_LABELS } from '../../lib/profile';
import { colors, radius } from '../../theme';

export default function MeScreen() {
  const { profile } = useProfile();
  const watch = useWatchData();
  const watchAllowed = watch.access?.sleep && watch.access.heart;
  const details = [
    profile.heightCm ? `${profile.heightCm} cm` : 'Height not set',
    profile.sex ? (profile.sex === 'male' ? 'Male' : 'Female') : null,
    profile.birthYear ? `Born ${profile.birthYear}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Me</Text>

        <Item
          title="Your details"
          subtitle={`${details}\nStep goal ${formatCount(profile.stepGoal)} · Heart risk: ${HEART_RISK_LABELS[profile.heartRisk].toLowerCase()}`}
          href="/profile"
        />
        <Item
          title="Backup and export"
          subtitle="Save your data to Drive or Files, or restore it"
          href="/backup"
        />

        <View style={styles.about}>
          <Text style={styles.aboutText}>
            Sehat {Constants.expoConfig?.version} · Your data stays on this phone. No account, no ads.
          </Text>
          <Text style={styles.aboutText}>
            Sehat gives information, not medical advice. Talk to your doctor about results.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ItemProps = { title: string; subtitle: string } & ({ href: Href } | { onPress: () => void });

function Item({ title, subtitle, ...action }: ItemProps) {
  const onPress = 'href' in action ? () => router.push(action.href) : action.onPress;
  return (
    <Pressable style={styles.item} onPress={onPress} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 16,
  },
  itemTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  itemSubtitle: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 28, color: colors.inactive },
  about: { gap: 6, marginTop: 12 },
  aboutText: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
