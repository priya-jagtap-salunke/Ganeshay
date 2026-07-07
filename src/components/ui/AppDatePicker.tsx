import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Text, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parseISO, isValid } from 'date-fns';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { formatDisplayDate, getTodayString } from '@/utils/dates';
import { radius } from '@/theme/spacing';

interface AppDatePickerProps {
  label: string;
  value?: string;
  onChange: (date: string) => void;
  error?: string;
  minimumDate?: Date;
  optional?: boolean;
  style?: ViewStyle;
}

function toDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function AppDatePicker({
  label,
  value,
  onChange,
  error,
  minimumDate,
  optional = false,
  style,
}: AppDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const displayValue = value
    ? formatDisplayDate(value)
    : optional
      ? 'Tap to select (optional)'
      : formatDisplayDate(getTodayString());

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(toDateString(selectedDate));
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.field, shadows.sm as ViewStyle, error ? styles.fieldError : null]}>
          <input
            type="date"
            value={value ?? ''}
            min={minimumDate ? toDateString(minimumDate) : undefined}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 18,
              padding: 4,
              fontFamily: 'System, sans-serif',
              color: colors.textPrimary,
            }}
          />
        </View>
        {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.field, shadows.sm as ViewStyle, error ? styles.fieldError : null]}
      >
        <Text style={styles.value}>{displayValue}</Text>
        <MaterialCommunityIcons name="calendar-month" size={24} color={colors.goldDark} />
      </Pressable>
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      {showPicker && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker ? (
        <Pressable onPress={() => setShowPicker(false)} style={styles.iosDone}>
          <Text style={styles.iosDoneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginLeft: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.grayLight,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  fieldError: {
    borderColor: colors.error,
  },
  value: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  iosDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iosDoneText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.royalRed,
  },
});
