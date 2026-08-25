import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  accentColor?: string;
  index?: number;
  compact?: boolean;
  width?: number;
}

function withAlpha(hex: string, alphaHex: string): string {
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 9)) {
    return `${hex.slice(0, 7)}${alphaHex}`;
  }
  return hex;
}

export function StatCard({
  title,
  value,
  icon = 'chart-box',
  accentColor,
  index = 0,
  compact = false,
  width,
}: StatCardProps) {
  const theme = useTheme();
  const accent = accentColor ?? theme.colors.primary;
  const iconSize = compact ? 15 : 24;
  const circleSize = compact ? 26 : 40;
  const surface = theme.colors.elevation?.level1 ?? theme.colors.surface;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={[
        styles.wrapper,
        compact && styles.wrapperCompact,
        compact && width != null && { width, minWidth: width, marginHorizontal: 0 },
        elevation.level1 as ViewStyle,
        {
          backgroundColor: surface,
          borderRadius: compact ? radius.md : radius.lg,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={[styles.accentStrip, compact && styles.accentStripCompact, { backgroundColor: accent }]} />
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View
          style={[
            styles.iconCircle,
            compact && styles.iconCircleCompact,
            {
              backgroundColor: withAlpha(accent, '1A'),
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={iconSize} color={accent} />
        </View>
        <Text
          variant={compact ? 'titleSmall' : 'headlineSmall'}
          style={[styles.value, { color: accent }, compact && styles.valueCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {value}
        </Text>
        <Text
          variant="labelMedium"
          style={[
            styles.title,
            { color: theme.colors.onSurfaceVariant },
            compact && styles.titleCompact,
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 150,
    margin: spacing.sm,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  wrapperCompact: {
    flex: 0,
    width: 108,
    minWidth: 108,
    marginHorizontal: spacing.xxs,
    marginVertical: spacing.xxs,
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  accentStripCompact: {
    width: 2,
  },
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minHeight: 132,
  },
  cardCompact: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs + 2,
    paddingHorizontal: spacing.xxs,
    minHeight: 78,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconCircleCompact: {
    marginBottom: spacing.xxs,
  },
  value: {
    fontWeight: '600',
    marginBottom: 2,
  },
  valueCompact: {
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 1,
  },
  title: {
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
});
