import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import {
  TelecallingFilterId,
  TELECALLING_FILTERS,
} from '@/types/telecalling';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface TelecallingFilterBarProps {
  value: TelecallingFilterId;
  onChange: (id: TelecallingFilterId) => void;
  counts?: Partial<Record<TelecallingFilterId, number>>;
}

const SHORT_LABELS: Partial<Record<TelecallingFilterId, string>> = {
  remaining: 'Remaining',
  called: 'Already called',
  call_again: 'Call again',
  no_answer_busy: 'No answer',
  wrong_number: 'Wrong no.',
};

export function TelecallingFilterBar({
  value,
  onChange,
  counts,
}: TelecallingFilterBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
      >
        {TELECALLING_FILTERS.map((filter) => {
          const selected = value === filter.id;
          const count = counts?.[filter.id];
          const base = SHORT_LABELS[filter.id] ?? filter.label;
          const label =
            typeof count === 'number' ? `${base} (${count})` : base;

          return (
            <Chip
              key={filter.id}
              selected={selected}
              showSelectedOverlay
              onPress={() => onChange(filter.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? colors.goldLight
                    : theme.colors.surfaceVariant,
                  borderWidth: selected ? 1 : StyleSheet.hairlineWidth,
                  borderColor: selected
                    ? colors.royalRed
                    : theme.colors.outlineVariant,
                },
              ]}
              textStyle={{
                fontSize: 12,
                fontWeight: selected ? '700' : '500',
                color: selected ? colors.royalRedDark : theme.colors.onSurfaceVariant,
              }}
              compact
              accessibilityState={{ selected }}
              accessibilityLabel={label}
            >
              {label}
            </Chip>
          );
        })}
        <View style={{ width: spacing.sm }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
    elevation: 2,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    marginRight: 2,
  },
});
