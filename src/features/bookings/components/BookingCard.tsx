import { StyleSheet, View, ViewStyle, Pressable, Platform } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Booking } from '@/types/booking';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { formatCurrency } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/dates';
import { radius, spacing, touchTarget } from '@/theme/spacing';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  index?: number;
  showDate?: boolean;
}

export function BookingCard({
  booking,
  onPress,
  index = 0,
  showDate = false,
}: BookingCardProps) {
  const theme = useTheme();
  const isDelivered = booking.status === 'Delivered';
  const statusColor = isDelivered ? colors.success : theme.colors.tertiary;
  const statusBg = isDelivered ? colors.successContainer : colors.pendingContainer;

  return (
    <Animated.View entering={FadeInRight.delay(index * 40).springify()}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: theme.colors.primary + '18' }}
        accessibilityRole="button"
        accessibilityLabel={`Booking ${booking.booking_number}, ${booking.customer_name}`}
        style={({ pressed }) => [
          styles.card,
          elevation.level1 as ViewStyle,
          {
            backgroundColor: theme.colors.elevation?.level1 ?? theme.colors.surface,
            borderRadius: radius.lg,
          },
          pressed && Platform.OS !== 'android' && styles.cardPressed,
        ]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.numberBadge,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}
            >
              {booking.booking_number}
            </Text>
          </View>
          <Chip
            compact
            style={[styles.chip, { backgroundColor: statusBg }]}
            textStyle={[styles.chipText, { color: statusColor }]}
          >
            {booking.status}
          </Chip>
        </View>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {booking.customer_name}
        </Text>
        {showDate ? (
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.tertiary, marginTop: 2 }}
          >
            {formatDisplayDate(booking.booking_date)}
          </Text>
        ) : null}
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
        >
          {booking.murti_name}
        </Text>
        <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
          <View style={styles.pendingRow}>
            <MaterialCommunityIcons
              name="cash"
              size={20}
              color={theme.colors.tertiary}
            />
            <Text variant="labelLarge" style={{ color: theme.colors.tertiary }}>
              Pending: {formatCurrency(booking.pending)}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    minHeight: touchTarget.min,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  numberBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    height: 28,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 12,
    marginVertical: 0,
  },
});
