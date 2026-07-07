import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  accentColor?: string;
  index?: number;
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  icon = 'chart-box',
  accentColor = colors.royalRed,
  index = 0,
  compact = false,
}: StatCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={[styles.wrapper, compact && styles.wrapperCompact, shadows.md as ViewStyle]}
    >
      <View style={[styles.card, { borderTopColor: accentColor }]}>
        <View style={[styles.iconCircle, { borderColor: accentColor }]}>
          <MaterialCommunityIcons name={icon} size={28} color={accentColor} />
        </View>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 150,
    margin: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  wrapperCompact: {
    flex: 0,
    width: 132,
    minWidth: 132,
    marginHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderTopWidth: 4,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minHeight: 148,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.warmIvory,
    borderWidth: 2,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.royalRed,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: spacing.sm,
  },
});
