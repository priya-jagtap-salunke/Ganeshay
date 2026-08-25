import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface EmptyStateProps {
  message: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  compact?: boolean;
}

export function EmptyState({
  message,
  icon = 'book-search-outline',
  compact = false,
}: EmptyStateProps) {
  const theme = useTheme();
  const surface = theme.colors.elevation?.level1 ?? theme.colors.surface;

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        compact && (elevation.level0 as ViewStyle),
        compact && {
          backgroundColor: surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      accessibilityRole="text"
    >
      <View
        style={[
          styles.iconCircle,
          compact && styles.iconCircleCompact,
          { backgroundColor: theme.colors.primaryContainer },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={compact ? 28 : 40}
          color={theme.colors.primary}
        />
      </View>
      <Text
        variant={compact ? 'bodyMedium' : 'bodyLarge'}
        style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  containerCompact: {
    marginTop: 0,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCircleCompact: {
    width: 56,
    height: 56,
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
  },
});
