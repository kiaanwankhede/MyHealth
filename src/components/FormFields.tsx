import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDate } from '../lib/dates';
import { colors } from '../theme';

type NumberFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  highlight?: boolean;
  placeholder?: string;
};

export function NumberField({ label, value, onChangeText, unit, highlight, placeholder = '0' }: NumberFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, highlight && styles.boxHighlight]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.inactive}
          accessibilityLabel={label}
          maxLength={6}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

export function KgField(props: Omit<NumberFieldProps, 'unit' | 'placeholder'>) {
  return <NumberField {...props} unit="kg" placeholder="0.0" />;
}

type TextFieldProps = { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string };

export function TextField({ label, value, onChangeText, placeholder }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <TextInput
          style={[styles.input, styles.textInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inactive}
          accessibilityLabel={label}
          maxLength={60}
        />
      </View>
    </View>
  );
}

type DateFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DateField({ label, value, onChange, minimumDate, maximumDate }: DateFieldProps) {
  const open = () =>
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate,
      maximumDate,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(date);
      },
    });

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.box} onPress={open} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={styles.input}>{formatDate(value)}</Text>
        <Text style={styles.unit}>Change</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 15, color: colors.muted },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  boxHighlight: { borderColor: colors.teal },
  input: { flex: 1, fontSize: 22, fontWeight: '600', color: colors.ink, paddingVertical: 10 },
  textInput: { fontSize: 18, fontWeight: '400' },
  unit: { fontSize: 16, color: colors.muted, marginLeft: 8 },
});
