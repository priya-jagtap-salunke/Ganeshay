import { useCallback, useRef, useState } from 'react';
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
  const {
    shareBookingDetailsOnWhatsApp,
    shareInvoicePdfOnWhatsApp,
    prefetchPdf,
  } = useReceipt();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);
  /** Sync lock — React state alone cannot block double-taps before re-render. */
  const saveLockRef = useRef(false);
  /** Clears the form on next focus after a successful save (screen may stay mounted). */
  const clearFormOnNextFocusRef = useRef(false);
  const [formResetSignal, setFormResetSignal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setShowSuccess(false);
      setSavedBooking(null);
      setSaving(false);
      saveLockRef.current = false;

      if (clearFormOnNextFocusRef.current) {
        clearFormOnNextFocusRef.current = false;
        setFormResetSignal((n) => n + 1);
      }
    }, [])
  );

  const handleSubmit = async (data: BookingSchemaType) => {
    if (saveLockRef.current || saving || showSuccess) return;
    saveLockRef.current = true;
    setSaving(true);
    try {
      const booking = await createBooking.mutateAsync(data);
      setSavedBooking(booking);
      setShowSuccess(true);
      clearFormOnNextFocusRef.current = true;
      setFormResetSignal((n) => n + 1);
      prefetchPdf(booking);
      // Keep lock after success until leaving the screen.
    } catch (err) {
      saveLockRef.current = false;
      const message = getErrorMessage(err);
      const isDuplicate =
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('same customer name');
      Alert.alert(isDuplicate ? 'Duplicate Entry' : 'Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccess(false);
    router.replace('/(app)/dashboard');
  };

  const handleShareBookingDetails = async () => {
    if (!savedBooking) return;
    await shareBookingDetailsOnWhatsApp(savedBooking);
  };

  const handleShareInvoicePdf = async () => {
    if (!savedBooking) return;
    await shareInvoicePdfOnWhatsApp(savedBooking);
  };

  return (
    <ScreenContainer
      title="New Booking"
      onBack={() => router.replace('/(app)/dashboard')}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BookingForm
          onSubmit={handleSubmit}
          isLoading={saving || showSuccess}
          resetOnFocus
          resetSignal={formResetSignal}
          pickerSession={{ returnTo: 'booking-new' }}
        />
      </ScrollView>

      <LoadingOverlay visible={saving} />

      <SuccessDialog
        visible={showSuccess}
        title="✅ Booking Saved Successfully!"
        message="Your booking has been saved successfully."
        onShareBookingDetails={handleShareBookingDetails}
        onShareInvoicePdf={handleShareInvoicePdf}
        bookingDetailsLoading={false}
        invoicePdfLoading={false}
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
