import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { promptsForCategory } from '../constants';
import { SuggestedPromptCategory } from '../types';
import { spacing, radius } from '@/theme/spacing';

interface SuggestedQuestionsProps {
  category: SuggestedPromptCategory;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({
  category,
  onSelect,
  disabled,
}: SuggestedQuestionsProps) {
  const theme = useTheme();
  const items = promptsForCategory(category);
  const chipBg =
    category === 'marketing'
      ? theme.colors.tertiaryContainer
      : category === 'sales'
        ? theme.colors.secondaryContainer
        : theme.colors.primaryContainer;
  const chipFg =
    category === 'marketing'
      ? theme.colors.onTertiaryContainer
      : category === 'sales'
        ? theme.colors.onSecondaryContainer
        : theme.colors.onPrimaryContainer;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: theme.colors.onSurfaceVariant }]}>
        Suggested
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            disabled={disabled}
            onPress={() => onSelect(item.prompt)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: chipBg,
                opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: chipFg }]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  heading: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
