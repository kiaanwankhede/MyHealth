import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';

/** Shown when the weight trend has been flat for three weeks and the goal isn't reached. */
export function PlateauCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your trend has been flat for 3 weeks</Text>
      <Text style={styles.text}>
        Plateaus are normal: water and muscle changes can hide fat loss for a while. Keep weighing in. If it
        stays flat, adding about 2,000 steps a day or checking in with your doctor can get things moving
        again.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.orangeSoft, borderRadius: radius.pill, padding: 14, gap: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#8A3A0E' },
  text: { fontSize: 15, lineHeight: 21, color: '#8A3A0E' },
});
