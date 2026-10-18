import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toISODate } from '../lib/dates';
import type { DoseSlot, TakenDose } from '../lib/medicines';
import { colors } from '../theme';

/** Today's doses as tick boxes. */
export function DoseList({
  doses,
  onToggle,
}: {
  doses: DoseSlot[];
  onToggle: (d: TakenDose, taken: boolean) => void;
}) {
  const date = toISODate(new Date());
  return (
    <View style={styles.list}>
      {doses.map((d) => (
        <Pressable
          key={`${d.medicine.id}|${d.time}`}
          style={styles.row}
          onPress={() => onToggle({ medicineId: d.medicine.id, date, time: d.time }, !d.taken)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: d.taken }}
        >
          <View style={[styles.box, d.taken && styles.boxChecked]}>
            {d.taken && <Text style={styles.tick}>✓</Text>}
          </View>
          <Text style={styles.time}>{d.time}</Text>
          <Text style={[styles.name, d.taken && styles.done]} numberOfLines={1}>
            {d.medicine.name}
            {d.medicine.dose ? ` · ${d.medicine.dose}` : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.teal },
  tick: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  time: { fontSize: 15, fontWeight: '600', color: colors.muted, width: 48 },
  name: { flex: 1, fontSize: 16, color: colors.ink },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
});
