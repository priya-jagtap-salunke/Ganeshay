import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Text, HelperText, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parseISO, isValid } from 'date-fns';
import { formatDisplayDate, getTodayString } from '@/utils/dates';
import { radius, touchTarget } from '@/theme/spacing';

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
  const theme = useTheme();
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
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}
        >
          {label}
        </Text>
        <View
          style={[
            styles.field,
            {
              backgroundColor: theme.colors.surface,
              borderColor: error ? theme.colors.error : theme.colors.outline,
              borderRadius: radius.xs,
            },
          ]}
        >
          <input
            type="date"
            value={value ?? ''}
            min={minimumDate ? toDateString(minimumDate) : undefined}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 16,
              padding: 4,
              fontFamily: 'System, sans-serif',
              color: theme.colors.onSurface,
            }}
          />
        </View>
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${displayValue}`}
        android_ripple={{ color: theme.colors.primary + '18' }}
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.outline,
            borderRadius: radius.xs,
          },
        ]}
      >
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
          {displayValue}
        </Text>
        <MaterialCommunityIcons
          name="calendar-month"
          size={24}
          color={theme.colors.onSurfaceVariant}
        />
      </Pressable>
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}

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
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Done
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: touchTarget.comfortable,
    overflow: 'hidden',
  },
  iosDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
});
