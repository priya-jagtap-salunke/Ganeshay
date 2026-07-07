import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, Menu, Button } from 'react-native-paper';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius } from '@/theme/spacing';

interface SelectOption {
  label: string;
  value: string;
}

interface AppSelectProps {
  label: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
}

export function AppSelect({ label, value, options, onChange, error }: AppSelectProps) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? 'Select';

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setVisible(true)}
            style={[styles.button, shadows.sm as ViewStyle]}
            contentStyle={styles.buttonContent}
            textColor={colors.royalRed}
            icon={() => (
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.goldDark} />
            )}
          >
            {label}: {selectedLabel}
          </Button>
        }
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            onPress={() => {
              onChange(option.value);
              setVisible(false);
            }}
            title={option.label}
            titleStyle={styles.menuItem}
          />
        ))}
      </Menu>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  button: {
    borderColor: colors.goldLight,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.white,
  },
  buttonContent: {
    minHeight: 56,
    justifyContent: 'flex-start',
  },
  menuItem: {
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
});
