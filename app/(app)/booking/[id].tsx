import { useState } from 'react';
import { StyleSheet, ScrollView, Alert, View, Image } from 'react-native';
import { Text, Divider, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AppButton } from '@/components/ui/AppButton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { DeliveryDialog } from '@/features/bookings/components/DeliveryDialog';
import { BookingActions } from '@/features/bookings/components/BookingActions';
import {
  useBooking,
  useMarkDelivered,
  useDeleteBooking,
} from '@/features/bookings/hooks/useBookings';
import { useReceipt } from '@/features/receipt/hooks/useReceipt';
import { closeBookingDetails } from '@/utils/bookingNavigation';
import { formatCurrency } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

function DetailRow({
  label,
  value,
  highlight,
  valueColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
        {label}
      </Text>
      <Text
        variant="bodyLarge"
        style={[
          { color: theme.colors.onSurface, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
          highlight && { color: theme.colors.tertiary },
          valueColor ? { color: valueColor } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function BookingDetailsScreen() {
  const theme = useTheme();
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const { data: booking, isLoading } = useBooking(id ?? '');
  const markDelivered = useMarkDelivered();
  const deleteBooking = useDeleteBooking();
  const {
    downloadPdf,
    shareOnWhatsApp,
    isBusy,
    activeAction,
  } = useReceipt();
  const [showDelivery, setShowDelivery] = useState(false);

  const handleBack = () => closeBookingDetails(router, returnTo);

  const handleViewReceipt = () => {
    if (!booking?.id) return;
    router.push(`/(app)/booking/receipt/${booking.id}`);
  };

  const handleDelete = () => {
    if (!booking) return;
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
              onSuccess: () => {
                Alert.alert('Deleted', 'Booking deleted successfully.', [
                  { text: 'OK', onPress: () => router.replace('/(app)/dashboard') },
                ]);
              },
              onError: (err) => Alert.alert('Error', getErrorMessage(err)),
            });
          },
        },
      ]
    );
  };

  const handleDelivery = (amount: number) => {
    if (!booking) return;
    markDelivered.mutate(
      { booking, amountReceived: amount },
      {
        onSuccess: () => {
          setShowDelivery(false);
          Alert.alert('Success', 'Payment updated successfully.');
        },
        onError: (err) => Alert.alert('Error', getErrorMessage(err)),
      }
    );
  };

  if (isLoading || !booking) {
    return <LoadingOverlay visible />;
  }

  const statusColor =
    booking.status === 'Delivered' ? colors.success : theme.colors.tertiary;

  return (
    <ScreenContainer title={booking.booking_number} onBack={handleBack}>
      <LoadingOverlay visible={isBusy} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.primary, marginBottom: spacing.sm }}
        >
          Customer Details
        </Text>
        <DetailRow label="Name" value={booking.customer_name} />
        <DetailRow label="Phone" value={booking.mobile} />

        <Divider style={styles.divider} />

        <Text
          variant="titleMedium"
          style={{ color: theme.colors.primary, marginBottom: spacing.sm }}
        >
          Murti Details
        </Text>
        <DetailRow label="Murti" value={booking.murti_name} />
        {booking.murti_photo_uri ? (
          <Image
            source={{ uri: booking.murti_photo_uri }}
            style={styles.murtiPhoto}
            resizeMode="contain"
          />
        ) : null}

        <Divider style={styles.divider} />

        <Text
          variant="titleMedium"
          style={{ color: theme.colors.primary, marginBottom: spacing.sm }}
        >
          Payment Details
        </Text>
        <DetailRow label="Total" value={formatCurrency(booking.price)} />
        <DetailRow label="Advance" value={formatCurrency(booking.advance)} />
        <DetailRow
          label="Pending"
          value={formatCurrency(booking.pending)}
          highlight
        />
        {booking.payment_mode ? (
          <DetailRow label="Mode" value={booking.payment_mode} />
        ) : null}

        <DetailRow
          label="Booking Date"
          value={formatDisplayDate(booking.booking_date)}
        />
        <DetailRow
          label="Status"
          value={booking.status}
          valueColor={statusColor}
        />

        {booking.notes ? (
          <>
            <Divider style={styles.divider} />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, marginBottom: spacing.sm }}
            >
              Notes
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              {booking.notes}
            </Text>
          </>
        ) : null}

        <BookingActions
          onViewReceipt={handleViewReceipt}
          onDownloadPdf={() => downloadPdf(booking)}
          onShareWhatsApp={() => shareOnWhatsApp(booking)}
          onEdit={() => router.push(`/(app)/booking/edit/${booking.id}`)}
          onDelete={handleDelete}
          onMarkDelivered={() => setShowDelivery(true)}
          showMarkDelivered={booking.status === 'Pending'}
          isBusy={isBusy}
          activeAction={activeAction}
          markDeliveredLoading={markDelivered.isPending}
        />

        <AppButton variant="outline" icon="arrow-left" onPress={handleBack}>
          Back
        </AppButton>
      </ScrollView>

      <DeliveryDialog
        visible={showDelivery}
        booking={booking}
        onDismiss={() => setShowDelivery(false)}
        onConfirm={handleDelivery}
        isLoading={markDelivered.isPending}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  divider: {
    marginVertical: spacing.md,
  },
  murtiPhoto: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    backgroundColor: colors.warmIvory,
  },
});
