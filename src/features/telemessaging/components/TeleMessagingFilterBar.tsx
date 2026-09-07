import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import {
  TeleMessagingFilterId,
  TELEMESSAGING_FILTERS,
} from '@/types/telemessaging';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface TeleMessagingFilterBarProps {
  value: TeleMessagingFilterId;
  onChange: (id: TeleMessagingFilterId) => void;
  counts?: Partial<Record<TeleMessagingFilterId, number>>;
}

export function TeleMessagingFilterBar({
  value,
  onChange,
  counts,
}: TeleMessagingFilterBarProps) {
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
        {TELEMESSAGING_FILTERS.map((filter) => {
          const selected = value === filter.id;
          const count = counts?.[filter.id];
          const label =
            typeof count === 'number'
              ? `${filter.label} (${count})`
              : filter.label;

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
                color: selected
                  ? colors.royalRedDark
                  : theme.colors.onSurfaceVariant,
              }}
              compact
              accessibilityState={{ selected }}
              accessibilityLabel={label}
            >
              {label}
            </Chip>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -spacing.md,
    paddingBottom: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    height: 32,
  },
});
