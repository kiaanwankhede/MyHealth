import { StyleSheet, Text, type TextStyle } from 'react-native';

import { describeDelta } from '../lib/format';
import { colors } from '../theme';

type Props = {
  /** Change to show; nothing is rendered when null. */
  value: number | null;
  /** Formats the size of the change, e.g. 820 → "820". */
  format: (abs: number) => string;
  /** Which direction is good news (green); the other is orange. null: always neutral. */
  better: 'up' | 'down' | null;
  /** e.g. "this week", "vs yesterday". */
  suffix?: string;
  style?: TextStyle;
};

/** "+820", "−1,240", "±0": a change next to a stat, coloured by whether it is good news. */
export function Delta({ value, format, better, suffix, style }: Props) {
  if (value === null || !Number.isFinite(value)) return null;
  const { text, good } = describeDelta(value, format, better);
  const color = good === null ? colors.muted : good ? colors.tealDark : colors.orangeDark;
  return (
    <Text style={[styles.delta, { color }, style]}>
      {text}
      {suffix ? ` ${suffix}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  delta: { fontSize: 14, fontWeight: '600' },
});
