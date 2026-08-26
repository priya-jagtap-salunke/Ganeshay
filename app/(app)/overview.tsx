import {
  StyleSheet,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';
import { formatCurrency } from '@/utils/currency';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

/**
 * Overview tab — same stats cards/data as the former Home Overview section.
 * No calculation changes; only relocated for bottom navigation.
 */
export default function OverviewScreen() {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { data: stats, isLoading } = useDashboardStats();

  const statsReady = stats != null;
  const statCount = (n: number | undefined) => (statsReady ? (n ?? 0) : '—');

  // 2-column layout: readable type + cards that use available width
  const gridGap = spacing.sm;
  const sectionMargin = spacing.md;
  const panelInset = spacing.sm;
  const statsColumns = 2;
  const innerWidth = screenWidth - sectionMargin * 2 - panelInset * 2;
  const statCardWidth = Math.floor(
    (innerWidth - gridGap * (statsColumns - 1)) / statsColumns
  );

  return (
    <ScreenContainer title="Overview" showBack={false}>
      <LoadingOverlay visible={isLoading && !stats} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DashboardSection
          title="Overview"
          subtitle="Today's snapshot"
          icon="view-dashboard-outline"
          contained
        >
          <View style={styles.statsGrid}>
            <StatCard
              title="Today's Bookings"
              value={statCount(stats?.todayBookingsCount)}
              icon="calendar-check"
              accentColor={theme.colors.primary}
              index={0}
              width={statCardWidth}
            />
            <StatCard
              title="Total Bookings"
              value={statCount(stats?.totalBookingsCount)}
              icon="calendar-multiple-check"
              accentColor={theme.colors.primary}
              index={1}
              width={statCardWidth}
            />
            <StatCard
              title="Today's Collection"
              value={statsReady ? formatCurrency(stats.todayCollection) : '—'}
              icon="cash-multiple"
              accentColor={theme.colors.tertiary}
              index={2}
              width={statCardWidth}
            />
            <StatCard
              title="Pending Amount"
              value={statsReady ? formatCurrency(stats.pendingAmount) : '—'}
              icon="clock-outline"
              accentColor={theme.colors.tertiary}
              index={3}
              width={statCardWidth}
            />
            <StatCard
              title="Delivered"
              value={statCount(stats?.deliveredCount)}
              icon="truck-check-outline"
              accentColor={colors.success}
              index={4}
              width={statCardWidth}
            />
          </View>
        </DashboardSection>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
});
