import { Platform, Linking, Alert } from 'react-native';
import { BusinessSettings } from '@/types/settings';
import {
  formatWhatsAppPhone,
  getWhatsAppWebUrl,
} from '@/features/receipt/utils/whatsappMessage';
import {
  openDeviceWhatsAppApp,
  resolveInstalledWhatsAppApp,
  showWhatsAppMissingAlert,
  type WhatsAppAppKind,
} from '@/features/receipt/utils/whatsappApp';
import { shareWhatsAppMedia } from '@/features/receipt/utils/whatsappMediaShare';
import { buildStallDetailsWhatsAppMessage } from '@/features/telecalling/utils/stallDetailsWhatsAppMessage';
import {
  downloadMurtiesPdfOnWeb,
  ensureShareableMurtiesPdfUri,
} from '@/features/settings/utils/murtiesPdfStorage';
import { useSettingsStore } from '@/features/settings/store/settingsStore';

export interface TeleMessagingShareRecipient {
  mobile: string;
  customerName?: string | null;
}

const DEFAULT_CATALOG_FILENAME = 'Ganesha_Murties_Catalog.pdf';

function isUserCancelledShare(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes('user did not share') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled') ||
    msg.includes('ecancelled') ||
    msg.includes('ecanceled')
  );
}

function catalogFilename(settings: BusinessSettings): string {
  const name = (settings.murtiesPdfName ?? '').trim();
  if (!name) return DEFAULT_CATALOG_FILENAME;
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}

/** Latest Settings catalogue PDF (always from the persisted store). */
function resolveCatalogSettings(
  settings?: BusinessSettings | null
): BusinessSettings {
  const live = useSettingsStore.getState();
  return {
    ...live,
    ...(settings ?? {}),
    murtiesPdfUri: live.murtiesPdfUri ?? settings?.murtiesPdfUri ?? null,
    murtiesPdfName: live.murtiesPdfName ?? settings?.murtiesPdfName ?? null,
  };
}

/**
 * Share the Settings catalog into the customer's WhatsApp chat.
 * Android: PDF Intent attach. iOS: native PDF→image (WhatsApp-only, no Message ask).
 */
async function shareCatalogPdfFile(params: {
  phone: string;
  appKind: WhatsAppAppKind;
  pdfUri: string;
  filename: string;
}): Promise<void> {
  const { phone, appKind, pdfUri, filename } = params;

  // Never use forceDialog — that shows Messages vs WhatsApp.
  await shareWhatsAppMedia({
    title: 'Ganesh Murti Catalog',
    phone,
    appKind,
    url: pdfUri,
    type: 'application/pdf',
    filename,
    // Critical: no message — caption/text path drops the file.
    targetPhone: true,
    forceDialog: false,
  });
}

/**
 * Open WhatsApp with the Settings pre-drafted stall / location message only.
 */
export async function sharePredraftedMessageOnWhatsApp(
  recipient: TeleMessagingShareRecipient,
  settings: BusinessSettings
): Promise<void> {
  const phone = formatWhatsAppPhone(recipient.mobile);
  const resolved = resolveCatalogSettings(settings);
  const message = buildStallDetailsWhatsAppMessage(resolved, {
    customerName: recipient.customerName,
  }).trim();

  if (!phone) {
    Alert.alert('Invalid Mobile', 'Customer mobile number is missing or invalid.');
    return;
  }

  if (!message) {
    Alert.alert(
      'Message Missing',
      'Set the Tele-calling / enquiry message in Settings, then try again.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    const url = getWhatsAppWebUrl(phone, message);
    const opened = await Linking.canOpenURL(url);
    if (!opened) {
      Alert.alert('WhatsApp', 'Could not open WhatsApp Web.');
      return;
    }
    await Linking.openURL(url);
    return;
  }

  const installedApp = await resolveInstalledWhatsAppApp();
  if (!installedApp) {
    showWhatsAppMissingAlert();
    return;
  }

  await openDeviceWhatsAppApp(phone, message, installedApp);
}

/**
 * Tele-Messaging → Send catalogue:
 * Opens WhatsApp for the customer with the Settings catalogue attached
 * (PDF on Android; WhatsApp image of pages on iOS — no chooser / no spinner).
 */
export async function shareCatalogOnWhatsApp(
  recipient: TeleMessagingShareRecipient,
  settings?: BusinessSettings | null
): Promise<void> {
  const phone = formatWhatsAppPhone(recipient.mobile);
  const resolved = resolveCatalogSettings(settings);
  const filename = catalogFilename(resolved);

  if (!phone) {
    Alert.alert('Invalid Mobile', 'Customer mobile number is missing or invalid.');
    return;
  }

  if (!resolved.murtiesPdfUri) {
    Alert.alert(
      'Catalog Missing',
      'Upload the Ganesh Murti catalog PDF in Settings, then try again.'
    );
    return;
  }

  if (Platform.OS === 'web') {
    await downloadMurtiesPdfOnWeb(resolved.murtiesPdfUri, filename);
    Alert.alert(
      'Catalog Downloaded',
      'On web, attach the downloaded catalog PDF manually in WhatsApp Web.'
    );
    const url = getWhatsAppWebUrl(phone, '');
    try {
      await Linking.openURL(url);
    } catch {
      // PDF download is enough if chat open fails
    }
    return;
  }

  const installedApp = await resolveInstalledWhatsAppApp();
  if (!installedApp) {
    showWhatsAppMissingAlert();
    return;
  }

  let shareablePdfUri: string;
  try {
    shareablePdfUri = await ensureShareableMurtiesPdfUri(resolved.murtiesPdfUri);
  } catch (error) {
    console.warn('Could not prepare Settings catalog PDF for WhatsApp', error);
    Alert.alert(
      'PDF Attach Failed',
      'Could not prepare the catalog PDF from Settings. Re-upload it in Settings and try again.'
    );
    return;
  }

  try {
    await shareCatalogPdfFile({
      phone,
      appKind: installedApp,
      pdfUri: shareablePdfUri,
      filename,
    });
  } catch (error) {
    if (isUserCancelledShare(error)) return;

    // Retry alternate WhatsApp app (consumer ↔ business) — same as Android.
    const alternate: WhatsAppAppKind =
      installedApp === 'consumer' ? 'business' : 'consumer';
    try {
      await shareCatalogPdfFile({
        phone,
        appKind: alternate,
        pdfUri: shareablePdfUri,
        filename,
      });
      return;
    } catch (retryError) {
      if (isUserCancelledShare(retryError)) return;
    }

    console.warn('Catalogue WhatsApp share failed', error);
    Alert.alert(
      'WhatsApp Failed',
      'Could not share the Settings catalogue PDF. Please try again.'
    );
  }
}
