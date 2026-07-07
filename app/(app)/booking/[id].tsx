import { useState } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
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
  return (
    <Text style={styles.row}>
      <Text style={styles.label}>{label}: </Text>
      <Text
        style={[
          styles.value,
          highlight && styles.highlight,
          valueColor ? { color: valueColor } : undefined,
        ]}
      >
        {value}
      </Text>
    </Text>
  );
}

export default function BookingDetailsScreen() {
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const { data: booking, isLoading } = useBooking(id ?? '');
  const markDelivered = useMarkDelivered();
  const deleteBooking = useDeleteBooking();
  const {
    viewReceipt,
    downloadPdf,
    shareOnWhatsApp,
    isBusy,
    activeAction,
  } = useReceipt();
  const [showDelivery, setShowDelivery] = useState(false);

  const handleBack = () => closeBookingDetails(router, returnTo);

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
    booking.status === 'Delivered' ? colors.success : colors.deepSaffron;

  return (
    <ScreenContainer title={booking.booking_number} onBack={handleBack}>
      <LoadingOverlay visible={isBusy} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <DetailRow label="Name" value={booking.customer_name} />
        <DetailRow label="Phone" value={booking.mobile} />

        <Divider style={styles.divider} />

        <Text style={styles.sectionTitle}>Murti Details</Text>
        <DetailRow label="Murti" value={booking.murti_name} />

        <Divider style={styles.divider} />

        <Text style={styles.sectionTitle}>Payment Details</Text>
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
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{booking.notes}</Text>
          </>
        ) : null}

        <BookingActions
          onViewReceipt={() => viewReceipt(booking)}
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

        <AppButton
          variant="outline"
          icon="arrow-left"
          onPress={handleBack}
        >
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
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.royalRed,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  row: {
    fontSize: 18,
    marginVertical: 4,
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  highlight: {
    color: colors.deepSaffron,
  },
  divider: {
    marginVertical: 16,
  },
  notes: {
    fontSize: 16,
    color: colors.black,
  },
});
