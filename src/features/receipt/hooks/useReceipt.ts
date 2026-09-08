import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import {
  generateReceiptPdf,
  downloadReceiptPdf,
  shareReceipt,
  shareReceiptViaWhatsApp,
  invalidateReceiptCache,
  getCachedReceiptUri,
} from '../services/receiptService';
import { shareNewBookingDetailsOnWhatsApp } from '../services/whatsappService';
import { useBusinessDocumentSettings } from '@/features/settings/store/settingsStore';
import { Booking } from '@/types/booking';
import { getErrorMessage } from '@/utils/errors';
import { formatWhatsAppPhone } from '../utils/whatsappMessage';

export function useReceipt() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const settings = useBusinessDocumentSettings();
  const prefetchInFlight = useRef<Set<string>>(new Set());
  const sendInFlight = useRef(false);

  const getOrCreatePdf = useCallback(
    async (
      booking: Booking,
      forceRefresh = false,
      options?: { silent?: boolean }
    ): Promise<string> => {
      if (forceRefresh) {
        invalidateReceiptCache(booking.id);
      }

      const cached = getCachedReceiptUri(booking.id);
      if (cached && !forceRefresh) {
        return cached;
      }

      const silent = options?.silent === true;
      if (!silent) setIsGenerating(true);
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
        if (!silent) setIsGenerating(false);
      }
    },
    [settings]
  );

  /** Warm invoice PDF without a loading overlay. */
  const prefetchPdf = useCallback(
    (booking: Booking) => {
      if (prefetchInFlight.current.has(booking.id)) return;
      prefetchInFlight.current.add(booking.id);
      void generateReceiptPdf(booking, settings)
        .catch((error) => {
          console.warn('Receipt share prefetch failed', error);
        })
        .finally(() => {
          prefetchInFlight.current.delete(booking.id);
        });
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

  const downloadPdf = (booking: Booking) =>
    runAction('download', booking, async (uri) => {
      await downloadReceiptPdf(uri, booking.booking_number);
    });

  /** Opens WhatsApp for this booking contact with the prepared message. */
  const shareOnWhatsApp = async (
    booking: Booking,
    options?: { messageVariant?: 'default' | 'newBooking' }
  ) => {
    if (sendInFlight.current) return;
    sendInFlight.current = true;

    try {
      if (!(booking.customer_name ?? '').trim()) {
        Alert.alert(
          'Customer Name Missing',
          'This booking does not have a customer name.'
        );
        return;
      }
      const phone = formatWhatsAppPhone(booking.mobile ?? '');
      if (!phone || phone.length < 10) {
        Alert.alert(
          'Invalid Mobile',
          'This booking does not have a valid customer mobile number.'
        );
        return;
      }

      await shareReceiptViaWhatsApp(booking, '', options);
    } catch {
      // Errors surfaced via Alert
    } finally {
      sendInFlight.current = false;
    }
  };

  /** Predrafted booking message — WhatsApp deep link only. */
  const shareBookingDetailsOnWhatsApp = async (booking: Booking) => {
    if (sendInFlight.current) return;
    sendInFlight.current = true;
    try {
      await shareNewBookingDetailsOnWhatsApp(booking);
    } catch (error) {
      console.warn('Share booking details failed', error);
      Alert.alert(
        'Share Failed',
        getErrorMessage(error) || 'Could not open WhatsApp. Please try again.'
      );
    } finally {
      sendInFlight.current = false;
    }
  };

  /** Same as booking details — message deep link only (no Share sheet). */
  const shareInvoicePdfOnWhatsApp = async (booking: Booking) => {
    await shareBookingDetailsOnWhatsApp(booking);
  };

  const generateAndShare = (booking: Booking) =>
    runAction('share', booking, (uri) =>
      shareReceipt(uri, booking.booking_number)
    );

  return {
    downloadPdf,
    shareOnWhatsApp,
    shareBookingDetailsOnWhatsApp,
    shareInvoicePdfOnWhatsApp,
    generateAndShare,
    getOrCreatePdf,
    prefetchPdf,
    invalidatePdf,
    isGenerating,
    activeAction,
    isBusy: isGenerating || activeAction !== null,
  };
}
