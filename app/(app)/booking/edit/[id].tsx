import { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { BookingForm } from '@/features/bookings/components/BookingForm';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  useBooking,
  useUpdateBookingForm,
} from '@/features/bookings/hooks/useBookings';
import { invalidateReceiptCache } from '@/features/receipt/services/receiptService';
import { BookingSchemaType } from '@/features/bookings/schemas/bookingSchema';
import { getErrorMessage } from '@/utils/errors';

export default function EditBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: booking, isLoading } = useBooking(id ?? '');
  const updateBooking = useUpdateBookingForm();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: BookingSchemaType) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateBooking.mutateAsync({ id, formData: data });
      invalidateReceiptCache(id);
      Alert.alert('Success', 'Booking updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !booking) {
    return <LoadingOverlay visible />;
  }

  return (
    <ScreenContainer title="Edit Booking">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BookingForm
          defaultValues={{
            customer_name: booking.customer_name,
            mobile: booking.mobile,
            booking_date: booking.booking_date,
            price: Number(booking.price),
            advance: Number(booking.advance),
            payment_mode: booking.payment_mode ?? undefined,
            notes: booking.notes ?? undefined,
          }}
          onSubmit={handleSubmit}
          isLoading={saving}
          submitLabel="Update Booking"
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
});
