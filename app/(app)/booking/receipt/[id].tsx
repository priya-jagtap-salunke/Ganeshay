import { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/layout/AppHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReceiptViewer } from '@/features/receipt/components/ReceiptViewer';
import {
  buildReceiptViewHtml,
  generateReceiptPdf,
} from '@/features/receipt/services/receiptService';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { useBusinessDocumentSettings } from '@/features/settings/store/settingsStore';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';

export default function BookingReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading: bookingLoading } = useBooking(id ?? '');
  const settings = useBusinessDocumentSettings();
  const [html, setHtml] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!booking) {
        setHtml(null);
        setPdfUri(null);
        return;
      }
      setLoadingHtml(true);
      setError(null);
      try {
        // iOS: show the same Invoice PDF file so layout matches print exactly.
        if (Platform.OS === 'ios') {
          const uri = await generateReceiptPdf(booking, settings);
          if (!cancelled) {
            setPdfUri(uri);
            setHtml(null);
          }
          return;
        }

        const markup = await buildReceiptViewHtml(booking, settings);
        if (!cancelled) {
          setHtml(markup);
          setPdfUri(null);
        }
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
  const hasContent = Boolean(html || pdfUri);

  return (
    <View style={styles.root}>
      <AppHeader title="Receipt" showBack />
      <LoadingOverlay visible={busy && !hasContent} />

      {!busy && !booking ? (
        <EmptyState icon="file-document-outline" message="Booking not found." />
      ) : error && !hasContent ? (
        <EmptyState icon="alert-circle-outline" message={error} />
      ) : hasContent ? (
        <ReceiptViewer html={html} pdfUri={pdfUri} />
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
