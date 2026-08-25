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
import { BrandLogo } from '@/components/ui/BrandLogo';
import { BusinessLogo } from '@/components/ui/BusinessLogo';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { useTodayBookings } from '@/features/bookings/hooks/useTodayBookings';
import { useBusinessDocumentSettings } from '@/features/settings/store/settingsStore';
import { Booking } from '@/types/booking';
import { openBookingDetails } from '@/utils/bookingNavigation';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

/** Display serif for vendor title — matches receipt brand typography (no custom font package). */
const vendorTitleFontFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, "Times New Roman", Times, serif',
  default: 'serif',
});

const HOME_LOGO_SIZE = 56;

function isRenderableBusinessLogo(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return (
    /^data:image\/(jpeg|jpg|png|webp|gif);/i.test(uri) ||
    uri.startsWith('file://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('content://')
  );
}

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
  const { businessName, businessLogo } = useBusinessDocumentSettings();

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
  const vendorTitle = businessName?.trim() || 'My Ganapati Stall';
  const hasVendorLogo = isRenderableBusinessLogo(businessLogo);

  return (
    <ScreenContainer showBack={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View
          style={styles.homeHeader}
          accessibilityRole="header"
          accessibilityLabel={`${vendorTitle} home`}
        >
          {hasVendorLogo ? (
            <BusinessLogo size={HOME_LOGO_SIZE} style={styles.homeHeaderLogo} />
          ) : (
            <BrandLogo
              variant="icon"
              size={HOME_LOGO_SIZE}
              framed
              style={styles.homeHeaderLogo}
            />
          )}
          <View style={styles.homeHeaderText}>
            <Text
              variant="headlineSmall"
              style={[
                styles.homeHeaderTitle,
                {
                  color: theme.colors.onSurface,
                  fontFamily: vendorTitleFontFamily,
                },
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {vendorTitle}
            </Text>
            <Text
              variant="labelMedium"
              style={[
                styles.homeHeaderSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              Bappaji.com
            </Text>
          </View>
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
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.xs,
    backgroundColor: 'transparent',
  },
  homeHeaderLogo: {
    flexShrink: 0,
  },
  homeHeaderText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  homeHeaderTitle: {
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  homeHeaderSubtitle: {
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    opacity: 0.85,
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
