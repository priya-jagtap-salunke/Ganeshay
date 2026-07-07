import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  generateReceiptPdf,
  viewReceiptPdf,
  downloadReceiptPdf,
  shareReceipt,
  shareReceiptViaWhatsApp,
  invalidateReceiptCache,
} from '../services/receiptService';
import {
  useBusinessDocumentSettings,
} from '@/features/settings/store/settingsStore';
import { Booking } from '@/types/booking';
import { getErrorMessage } from '@/utils/errors';

export function useReceipt() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const settings = useBusinessDocumentSettings();

  const getOrCreatePdf = useCallback(
    async (booking: Booking, forceRefresh = false): Promise<string> => {
      if (forceRefresh) {
        invalidateReceiptCache(booking.id);
      }

      setIsGenerating(true);
      try {
        return await generateReceiptPdf(booking, settings);
      } catch (error) {
        Alert.alert(
          'PDF Generation Failed',
          getErrorMessage(error) ||
            'Could not generate the receipt PDF. Please try again.'
        );
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [settings]
  );

  const invalidatePdf = useCallback((bookingId: string) => {
    invalidateReceiptCache(bookingId);
  }, []);

  const runAction = async (
    actionKey: string,
    booking: Booking,
    action: (pdfUri: string) => Promise<void>,
    forceRefresh = true
  ) => {
    setActiveAction(actionKey);
    try {
      const pdfUri = await getOrCreatePdf(booking, forceRefresh);
      await action(pdfUri);
    } catch {
      // Errors surfaced via Alert in getOrCreatePdf
    } finally {
      setActiveAction(null);
    }
  };

  const viewReceipt = (booking: Booking) =>
    runAction('view', booking, viewReceiptPdf);

  const downloadPdf = (booking: Booking) =>
    runAction('download', booking, (uri) =>
      downloadReceiptPdf(uri, booking.booking_number)
    );

  const shareOnWhatsApp = (booking: Booking) =>
    runAction('whatsapp', booking, (uri) =>
      shareReceiptViaWhatsApp(booking, uri)
    );

  const generateAndShare = (booking: Booking) =>
    runAction('share', booking, (uri) =>
      shareReceipt(uri, booking.booking_number)
    );

  return {
    viewReceipt,
    downloadPdf,
    shareOnWhatsApp,
    generateAndShare,
    getOrCreatePdf,
    invalidatePdf,
    isGenerating,
    activeAction,
    isBusy: isGenerating || activeAction !== null,
  };
}
