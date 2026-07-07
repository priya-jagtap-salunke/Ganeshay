import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Booking } from '@/types/booking';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { formatCurrency } from '@/utils/currency';
import { radius, spacing } from '@/theme/spacing';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  index?: number;
}

export function BookingCard({ booking, onPress, index = 0 }: BookingCardProps) {
  const isDelivered = booking.status === 'Delivered';
  const statusColor = isDelivered ? colors.success : colors.deepSaffron;

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          shadows.md as ViewStyle,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.numberBadge}>
            <Text style={styles.bookingNumber}>{booking.booking_number}</Text>
          </View>
          <Chip
            style={[styles.chip, { backgroundColor: statusColor }]}
            textStyle={styles.chipText}
          >
            {booking.status}
          </Chip>
        </View>
        <Text style={styles.customerName}>{booking.customer_name}</Text>
        <Text style={styles.murtiName}>{booking.murti_name}</Text>
        <View style={styles.footer}>
          <View style={styles.pendingRow}>
            <MaterialCommunityIcons name="cash-clock" size={18} color={colors.deepSaffron} />
            <Text style={styles.pending}>
              Pending: {formatCurrency(booking.pending)}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.goldDark} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  numberBadge: {
    backgroundColor: colors.warmIvory,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  bookingNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.royalRed,
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  murtiName: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pending: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.deepSaffron,
  },
  chip: {
    height: 28,
  },
  chipText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
    marginVertical: 0,
  },
});
