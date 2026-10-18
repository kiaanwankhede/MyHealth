import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { HealthConnectStatus } from '../health/healthConnect';
import { colors, radius } from '../theme';

const HEALTH_CONNECT_PLAY_URL =
  'market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding';

type Props = {
  status: Exclude<HealthConnectStatus, 'ready'>;
  onConnect: () => void;
};

const copy = {
  'needs-permission': {
    title: 'Connect Health Connect',
    body: 'Sehat reads your steps and weight from Health Connect, where Google Fit already saves them.',
    action: 'Allow access',
  },
  'needs-update': {
    title: 'Update Health Connect',
    body: 'Your Health Connect app needs an update from the Play Store before Sehat can read your data.',
    action: 'Open Play Store',
  },
  unavailable: {
    title: 'Health Connect not found',
    body: 'Install Health Connect from the Play Store. It is built in on Android 14 and later.',
    action: 'Open Play Store',
  },
} as const;

export function ConnectCard({ status, onConnect }: Props) {
  const { title, body, action } = copy[status];
  const onPress =
    status === 'needs-permission' ? onConnect : () => Linking.openURL(HEALTH_CONNECT_PLAY_URL);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.tealSoft, borderRadius: radius.card, padding: 20, gap: 10 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  body: { fontSize: 16, lineHeight: 22, color: colors.muted },
  button: {
    marginTop: 6,
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
});
