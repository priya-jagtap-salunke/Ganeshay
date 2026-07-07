import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

interface EmptyStateProps {
  message: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export function EmptyState({
  message,
  icon = 'book-search-outline',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.goldDark} />
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.warmIvory,
    borderWidth: 2,
    borderColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  message: {
    textAlign: 'center',
    fontSize: 17,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 26,
  },
});
