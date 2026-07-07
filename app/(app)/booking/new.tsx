import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { BookingForm } from '@/features/bookings/components/BookingForm';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { SuccessDialog } from '@/components/ui/SuccessDialog';
import { useCreateBooking } from '@/features/bookings/hooks/useBookings';
import { useReceipt } from '@/features/receipt/hooks/useReceipt';
import { BookingSchemaType } from '@/features/bookings/schemas/bookingSchema';
import { Booking } from '@/types/booking';
import { getErrorMessage } from '@/utils/errors';

export default function NewBookingScreen() {
  const router = useRouter();
  const createBooking = useCreateBooking();
  const { shareOnWhatsApp, isBusy, activeAction } = useReceipt();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);

  useFocusEffect(
    useCallback(() => {
      setShowSuccess(false);
      setSavedBooking(null);
      setSaving(false);
    }, [])
  );

  const handleSubmit = async (data: BookingSchemaType) => {
    setSaving(true);
    try {
      const booking = await createBooking.mutateAsync(data);
      setSavedBooking(booking);
      setShowSuccess(true);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccess(false);
    router.replace('/(app)/dashboard');
  };

  const handleShareWhatsApp = async () => {
    if (!savedBooking) return;
    setShowSuccess(false);
    await shareOnWhatsApp(savedBooking);
  };

  return (
    <ScreenContainer
      title="New Booking"
      onBack={() => router.replace('/(app)/dashboard')}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BookingForm onSubmit={handleSubmit} isLoading={saving} resetOnFocus />
      </ScrollView>

      <LoadingOverlay visible={isBusy} />

      <SuccessDialog
        visible={showSuccess}
        title="✅ Booking Saved Successfully!"
        message="Your booking has been saved successfully."
        onShareWhatsApp={handleShareWhatsApp}
        whatsAppLoading={isBusy && activeAction === 'whatsapp'}
        onConfirm={handleSuccessConfirm}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
});
