import {
  StyleSheet,
  View,
  ScrollView,
  ViewStyle,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { BusinessLogo } from '@/components/ui/BusinessLogo';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { useTodayBookings } from '@/features/bookings/hooks/useTodayBookings';
import { Booking } from '@/types/booking';
import { openBookingDetails } from '@/utils/bookingNavigation';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface QuickActionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  width: number;
  emphasized?: boolean;
}

function withAlpha(hex: string, alphaHex: string): string {
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 9)) {
    return `${hex.slice(0, 7)}${alphaHex}`;
  }
  return hex;
}

function QuickAction({
  icon,
  label,
  onPress,
  color,
  width,
  emphasized = false,
}: QuickActionProps) {
  const theme = useTheme();
  const surface = emphasized
    ? theme.colors.primaryContainer
    : theme.colors.elevation?.level1 ?? theme.colors.surface;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[styles.actionWrapper, { width }]}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{ color: color + '22' }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.actionCard,
          elevation.level1 as ViewStyle,
          {
            backgroundColor: surface,
            borderRadius: radius.lg,
            borderColor: emphasized
              ? withAlpha(theme.colors.primary, '55')
              : theme.colors.outlineVariant,
            borderWidth: emphasized ? 1.5 : StyleSheet.hairlineWidth,
          },
          pressed && Platform.OS !== 'android' && { opacity: 0.9 },
        ]}
      >
        <View
          style={[
            styles.actionIcon,
            {
              backgroundColor: withAlpha(color, '1A'),
              width: emphasized ? 44 : 40,
              height: emphasized ? 44 : 40,
              borderRadius: emphasized ? 22 : 20,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={emphasized ? 24 : 22}
            color={color}
          />
        </View>
        <Text
          variant="labelMedium"
          style={{
            color: theme.colors.onSurface,
            textAlign: 'center',
            fontWeight: emphasized ? '700' : '600',
            fontSize: 12,
            lineHeight: 15,
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { data: todayBookings } = useTodayBookings();

  const gridGap = spacing.sm;
  const horizontalPad = spacing.md;
  const panelInset = spacing.xs;
  const actionColumns = 3;
  const innerWidth = screenWidth - horizontalPad * 2 - panelInset * 2;
  const actionWidth = Math.floor(
    (innerWidth - gridGap * (actionColumns - 1)) / actionColumns
  );

  const todayCount = todayBookings?.length ?? 0;
  const hasTodayBookings = todayCount > 0;
  const year = new Date().getFullYear();

  return (
    <ScreenContainer showBack={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.homeHeader}>
          <BusinessLogo size={36} style={styles.homeHeaderLogo} />
          <Text
            variant="titleMedium"
            style={[styles.homeHeaderTitle, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            Bappaji.com
          </Text>
        </View>

        <DashboardSection
          title="Quick actions"
          subtitle="Jump into common tasks"
          icon="flash-outline"
          contained
          dense
        >
          <View style={[styles.actionsGrid, { gap: gridGap }]}>
            <QuickAction
              icon="plus-circle"
              label="New Booking"
              color={theme.colors.primary}
              width={actionWidth}
              emphasized
              onPress={() => router.push('/(app)/booking/new')}
            />
            <QuickAction
              icon="magnify"
              label="Search"
              color={theme.colors.tertiary}
              width={actionWidth}
              onPress={() => router.push('/(app)/booking/search')}
            />
            <QuickAction
              icon="calendar-month"
              label={`${year} Bookings`}
              color={theme.colors.primary}
              width={actionWidth}
              onPress={() => router.push('/(app)/booking/year')}
            />
            <QuickAction
              icon="phone-in-talk"
              label="Add Enquiry"
              color={colors.success}
              width={actionWidth}
              onPress={() => router.push('/(app)/enquiries')}
            />
            <QuickAction
              icon="phone-outgoing"
              label="Tele-calling"
              color={theme.colors.tertiary}
              width={actionWidth}
              onPress={() => router.push('/(app)/telecalling' as Href)}
            />
            <QuickAction
              icon="cog"
              label="Settings"
              color={theme.colors.onSurfaceVariant}
              width={actionWidth}
              onPress={() => router.push('/(app)/settings')}
            />
          </View>
        </DashboardSection>

        <DashboardSection
          title="Today's bookings"
          subtitle={
            hasTodayBookings
              ? `${todayCount} scheduled for today`
              : 'Nothing scheduled yet'
          }
          icon="calendar-clock"
          contained={false}
          trailing={
            hasTodayBookings ? (
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={{
                    color: theme.colors.onPrimaryContainer,
                    fontWeight: '600',
                  }}
                >
                  {todayCount}
                </Text>
              </View>
            ) : null
          }
        >
          {hasTodayBookings ? (
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              {todayBookings!.map((booking: Booking, i: number) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  index={i}
                  onPress={() => openBookingDetails(router, booking.id, 'dashboard')}
                />
              ))}
            </Animated.View>
          ) : (
            <EmptyState
              compact
              icon="calendar-blank-outline"
              message="No bookings for today. Create one from Quick actions."
            />
          )}
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
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: 'transparent',
  },
  homeHeaderLogo: {
    flexShrink: 0,
  },
  homeHeaderTitle: {
    flexShrink: 1,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionWrapper: {
    // width applied inline from layout calc
  },
  actionCard: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  actionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
