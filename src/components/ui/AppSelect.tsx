import { StyleSheet, View } from 'react-native';
import { Text, Menu, Button, useTheme } from 'react-native-paper';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius, touchTarget } from '@/theme/spacing';

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
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? 'Select';

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        contentStyle={{
          backgroundColor: theme.colors.elevation?.level2 ?? theme.colors.surface,
          borderRadius: radius.md,
        }}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setVisible(true)}
            style={[
              styles.button,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}
            contentStyle={styles.buttonContent}
            textColor={theme.colors.onSurface}
            accessibilityLabel={`${label}, ${selectedLabel}`}
            icon={() => (
              <MaterialCommunityIcons
                name="menu-down"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
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
            titleStyle={{ color: theme.colors.onSurface }}
            leadingIcon={option.value === value ? 'check' : undefined}
          />
        ))}
      </Menu>
      {error ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4, marginLeft: 12 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  button: {
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  buttonContent: {
    minHeight: touchTarget.comfortable,
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
});
