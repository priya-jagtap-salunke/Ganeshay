import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  trailing?: ReactNode;
  children: ReactNode;
  /** Soft panel behind content so sections don’t blend into one scroll. */
  contained?: boolean;
  /** Tighter spacing for dense grids (Overview / Quick actions). */
  dense?: boolean;
  style?: ViewStyle;
}

export function DashboardSection({
  title,
  subtitle,
  icon,
  trailing,
  children,
  contained = true,
  dense = false,
  style,
}: DashboardSectionProps) {
  const theme = useTheme();
  const surface = theme.colors.elevation?.level1 ?? theme.colors.surface;

  return (
    <View style={[styles.root, dense && styles.rootDense, style]}>
      <View style={[styles.headerRow, dense && styles.headerRowDense]}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.accentBar, { backgroundColor: theme.colors.primary }]}
          />
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              {icon ? (
                <MaterialCommunityIcons
                  name={icon}
                  size={dense ? 16 : 18}
                  color={theme.colors.primary}
                  style={styles.titleIcon}
                />
              ) : null}
              <Text
                variant="titleSmall"
                style={[
                  styles.title,
                  dense && styles.titleDense,
                  { color: theme.colors.onSurface },
                ]}
              >
                {title}
              </Text>
            </View>
            {subtitle ? (
              <Text
                variant="bodySmall"
                style={[
                  { color: theme.colors.onSurfaceVariant, marginTop: 1 },
                  dense && styles.subtitleDense,
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>

      {contained ? (
        <View
          style={[
            styles.panel,
            dense && styles.panelDense,
            elevation.level1 as ViewStyle,
            {
              backgroundColor: surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {children}
        </View>
      ) : (
        <View style={styles.uncontained}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.lg,
  },
  rootDense: {
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerRowDense: {
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.sm,
  },
  accentBar: {
    width: 3,
    borderRadius: radius.full,
    alignSelf: 'stretch',
    minHeight: 20,
    marginTop: 2,
  },
  titleBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: spacing.xs,
  },
  title: {
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  titleDense: {
    fontSize: 14,
    lineHeight: 18,
  },
  subtitleDense: {
    fontSize: 11,
    lineHeight: 14,
  },
  trailing: {
    flexShrink: 0,
    paddingTop: 2,
  },
  panel: {
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  panelDense: {
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  /** Lets children (e.g. BookingCard) keep their own horizontal margins. */
  uncontained: {},
});
