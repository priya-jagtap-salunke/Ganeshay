import { useEffect, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/layout/AppHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReceiptViewer } from '@/features/receipt/components/ReceiptViewer';
import { buildReceiptViewHtml } from '@/features/receipt/services/receiptService';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { useBusinessDocumentSettings } from '@/features/settings/store/settingsStore';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';

export default function BookingReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading: bookingLoading } = useBooking(id ?? '');
  const settings = useBusinessDocumentSettings();
  const [html, setHtml] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!booking) {
        setHtml(null);
        return;
      }
      setLoadingHtml(true);
      setError(null);
      try {
        const markup = await buildReceiptViewHtml(booking, settings);
        if (!cancelled) setHtml(markup);
      } catch (err) {
        if (!cancelled) {
          const message = getErrorMessage(err);
          setError(message);
          Alert.alert('Receipt Error', message);
        }
      } finally {
        if (!cancelled) setLoadingHtml(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [booking, settings]);

  const busy = bookingLoading || loadingHtml;

  return (
    <View style={styles.root}>
      <AppHeader title="Receipt" showBack />
      <LoadingOverlay visible={busy && !html} />

      {!busy && !booking ? (
        <EmptyState icon="file-document-outline" message="Booking not found." />
      ) : error && !html ? (
        <EmptyState icon="alert-circle-outline" message={error} />
      ) : html ? (
        <ReceiptViewer html={html} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
});
