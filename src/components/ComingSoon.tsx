import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

type Props = { title: string; description: string; step: number };

/** Placeholder for tabs that later roadmap steps fill in. */
export function ComingSoon({ title, description, step }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        <Text style={styles.badge}>Coming in step {step}</Text>
        <Text style={styles.body}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, gap: 8 },
  badge: { fontSize: 14, fontWeight: '600', color: colors.teal, textTransform: 'uppercase' },
  body: { fontSize: 16, lineHeight: 22, color: colors.muted },
});
