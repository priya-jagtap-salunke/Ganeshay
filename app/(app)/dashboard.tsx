import { StyleSheet, View, ScrollView, ViewStyle, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { BusinessLogo } from '@/components/ui/BusinessLogo';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';
import { useTodayBookings } from '@/features/bookings/hooks/useTodayBookings';
import { formatCurrency } from '@/utils/currency';
import { openBookingDetails } from '@/utils/bookingNavigation';
import { colors, gradients } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface QuickActionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
}

function QuickAction({ icon, label, onPress, color }: QuickActionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.actionWrapper}>
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9 }}>
        <LinearGradient
          colors={[colors.white, colors.warmIvory]}
          style={[styles.actionCard, shadows.md as ViewStyle]}
        >
          <MaterialCommunityIcons name={icon} size={32} color={color} />
          <Text style={styles.actionLabel}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: todayBookings } = useTodayBookings();

  const statsReady = stats != null;

  const statCount = (n: number | undefined) =>
    statsReady ? (n ?? 0) : '—';

  return (
    <ScreenContainer showBack={false}>
      <LoadingOverlay visible={isLoading && !stats} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[...gradients.hero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadows.lg as ViewStyle]}
        >
          <View style={styles.heroBrandRow}>
            <BusinessLogo size={130} style={styles.heroLogo} />
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreeting}>Namaste!</Text>
              <Text style={styles.heroTitle}>Bappaji.com</Text>
              <Text style={styles.heroSubtitle}>
                Eco-Friendly Shadu Mati Shree Ganesha Murti Stall Dashboard
              </Text>
            </View>
          </View>
          <View style={styles.heroDivider} />
        </LinearGradient>

        <Text style={styles.sectionLabelCentered}>OVERVIEW</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Today's Bookings"
            value={statCount(stats?.todayBookingsCount)}
            icon="calendar-check"
            accentColor={colors.royalRed}
            index={0}
            compact
          />
          <StatCard
            title="Total Bookings"
            value={statCount(stats?.totalBookingsCount)}
            icon="calendar-multiple-check"
            accentColor={colors.royalRedLight}
            index={1}
            compact
          />
          <StatCard
            title="Today's Collection"
            value={statsReady ? formatCurrency(stats.todayCollection) : '—'}
            icon="cash-multiple"
            accentColor={colors.goldDark}
            index={2}
            compact
          />
          <StatCard
            title="Pending Amount"
            value={statsReady ? formatCurrency(stats.pendingAmount) : '—'}
            icon="clock-outline"
            accentColor={colors.deepSaffron}
            index={3}
            compact
          />
          <StatCard
            title="Delivered"
            value={statCount(stats?.deliveredCount)}
            icon="truck-check-outline"
            accentColor={colors.success}
            index={4}
            compact
          />
        </View>

        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          <QuickAction
            icon="plus-circle"
            label="New Booking"
            color={colors.royalRed}
            onPress={() => router.push('/(app)/booking/new')}
          />
          <QuickAction
            icon="magnify"
            label="Search"
            color={colors.deepSaffron}
            onPress={() => router.push('/(app)/booking/search')}
          />
          <QuickAction
            icon="cog"
            label="Settings"
            color={colors.goldDark}
            onPress={() => router.push('/(app)/settings')}
          />
        </View>

        <Text style={styles.sectionLabel}>ENQUIRIES</Text>
        <View style={styles.actionsRow}>
          <QuickAction
            icon="phone-in-talk"
            label="Add Enquiry"
            color={colors.success}
            onPress={() => router.push('/(app)/enquiries')}
          />
        </View>

        {todayBookings && todayBookings.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.sectionLabel}>TODAY'S BOOKINGS</Text>
            {todayBookings.map((booking, i) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                index={i}
                onPress={() => openBookingDetails(router, booking.id, 'dashboard')}
              />
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    margin: spacing.md,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.goldLight,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroTextBlock: {
    flexShrink: 1,
  },
  heroLogo: {
    flexShrink: 0,
  },
  heroGreeting: {
    fontSize: 18,
    color: colors.goldLight,
    fontWeight: '600',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.white,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.goldLight,
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 18,
  },
  heroDivider: {
    width: 60,
    height: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginLeft: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabelCentered: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  actionWrapper: {
    width: '30%',
    minWidth: 96,
    marginHorizontal: spacing.xs,
  },
  actionCard: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.goldLight,
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
