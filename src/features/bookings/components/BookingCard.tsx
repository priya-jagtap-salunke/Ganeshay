import { Alert, StyleSheet, View, ViewStyle, Pressable, Platform } from 'react-native';
import { Text, Chip, IconButton, useTheme } from 'react-native-paper';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Booking } from '@/types/booking';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { formatCurrency } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { radius, spacing, touchTarget } from '@/theme/spacing';
import { useDeleteBooking } from '../hooks/useBookings';

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
  const deleteBooking = useDeleteBooking();
  const isDelivered = booking.status === 'Delivered';
  const statusColor = isDelivered ? colors.success : theme.colors.tertiary;
  const statusBg = isDelivered ? colors.successContainer : colors.pendingContainer;
  const isDeleting =
    deleteBooking.isPending && deleteBooking.variables === booking.id;

  const handleDelete = () => {
    Alert.alert(
      'Delete Booking',
      `Are you sure you want to delete ${booking.booking_number}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBooking.mutate(booking.id, {
              onError: (err) => Alert.alert('Error', getErrorMessage(err)),
            });
          },
        },
      ]
    );
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 40).springify()}>
      <View
        style={[
          styles.card,
          elevation.level1 as ViewStyle,
          {
            backgroundColor: theme.colors.elevation?.level1 ?? theme.colors.surface,
            borderRadius: radius.lg,
          },
        ]}
      >
        <IconButton
          icon="delete-outline"
          size={22}
          iconColor={theme.colors.error}
          onPress={handleDelete}
          disabled={isDeleting}
          accessibilityLabel={`Delete booking ${booking.booking_number}`}
          style={styles.deleteButton}
        />
        <Pressable
          onPress={onPress}
          android_ripple={{ color: theme.colors.primary + '18' }}
          accessibilityRole="button"
          accessibilityLabel={`Booking ${booking.booking_number}, ${booking.customer_name}`}
          style={({ pressed }) => [
            styles.cardPressable,
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
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    minHeight: touchTarget.min,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deleteButton: {
    margin: 0,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  cardPressable: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
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
