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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { BusinessLogo } from '@/components/ui/BusinessLogo';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { useTodayBookings } from '@/features/bookings/hooks/useTodayBookings';
import { useBusinessDocumentSettings } from '@/features/settings/store/settingsStore';
import { Booking } from '@/types/booking';
import { openBookingDetails } from '@/utils/bookingNavigation';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

/** Soft screen wash — warm ivory into a light brand rose. */
const DASHBOARD_BG = [colors.warmIvoryDark, colors.warmIvory, '#FFF7F5'] as const;
/** Vendor hero — brand royal red into deep maroon with a soft gold edge. */
const VENDOR_HEADER_BG = [
  colors.royalRedLight,
  colors.royalRed,
  colors.royalRedDark,
] as const;

/** Display serif for vendor title — matches receipt brand typography (no custom font package). */
const vendorTitleFontFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, "Times New Roman", Times, serif',
  default: 'serif',
});

const HOME_LOGO_SIZE = 64;

function withAlpha(hex: string, alphaHex: string): string {
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 9)) {
    return `${hex.slice(0, 7)}${alphaHex}`;
  }
  return hex;
}

interface QuickActionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  width: number;
  emphasized?: boolean;
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
  const { businessName } = useBusinessDocumentSettings();

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

  return (
    <ScreenContainer
      showBack={false}
      style={{ backgroundColor: colors.warmIvoryDark }}
    >
      <View style={styles.screenBody}>
        <LinearGradient
          colors={[...DASHBOARD_BG]}
          locations={[0, 0.4, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <Animated.View entering={FadeInDown.springify()}>
            <LinearGradient
              colors={[...VENDOR_HEADER_BG]}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.homeHeader}
              accessibilityRole="header"
              accessibilityLabel={`${vendorTitle} home`}
            >
              {/* Soft gold glow accents — atmosphere only, no extra content */}
              <View style={styles.homeHeaderGlowA} pointerEvents="none" />
              <View style={styles.homeHeaderGlowB} pointerEvents="none" />
              <View style={styles.homeHeaderGoldEdge} pointerEvents="none" />

              <View style={styles.homeHeaderLogoRing}>
                {/* Vendor logo when set; otherwise (or on load failure) Ganeshay BrandLogo */}
                <BusinessLogo
                  size={HOME_LOGO_SIZE}
                  style={styles.homeHeaderLogo}
                  showBrandFallback
                />
              </View>

              <View style={styles.homeHeaderText}>
                <Text
                  variant="headlineSmall"
                  style={[
                    styles.homeHeaderTitle,
                    { fontFamily: vendorTitleFontFamily },
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {vendorTitle}
                </Text>
                <View style={styles.homeHeaderMetaRow}>
                  <View style={styles.homeHeaderMetaRule} />
                  <Text
                    variant="labelMedium"
                    style={styles.homeHeaderSubtitle}
                    numberOfLines={1}
                  >
                    Bappaji.com
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

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
                    onPress={() =>
                      openBookingDetails(router, booking.id, 'dashboard')
                    }
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
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
  },
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
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.royalRedDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  homeHeaderGlowA: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: withAlpha(colors.goldLight, '33'),
    top: -70,
    right: -40,
  },
  homeHeaderGlowB: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: withAlpha(colors.white, '18'),
    bottom: -50,
    left: -20,
  },
  homeHeaderGoldEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.gold,
    opacity: 0.85,
  },
  homeHeaderLogoRing: {
    flexShrink: 0,
    padding: 4,
    borderRadius: radius.lg + 4,
    backgroundColor: withAlpha(colors.white, 'F2'),
    borderWidth: 1.5,
    borderColor: withAlpha(colors.gold, 'CC'),
  },
  homeHeaderLogo: {
    flexShrink: 0,
  },
  homeHeaderText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  homeHeaderTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  homeHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  homeHeaderMetaRule: {
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.goldLight,
    opacity: 0.95,
  },
  homeHeaderSubtitle: {
    color: colors.goldLight,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
