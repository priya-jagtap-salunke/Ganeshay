import { Platform, Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
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
    msg.includes('ecanceled') ||
    msg.includes('share cancelled') ||
    msg.includes('share canceled')
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

async function assertValidPdfFile(fileUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.isDirectory) {
    throw new Error('Catalogue PDF file was not found on device.');
  }
  if (typeof info.size === 'number' && info.size < 64) {
    throw new Error('Catalogue PDF is empty or incomplete.');
  }

  try {
    const head = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 8,
      position: 0,
    });
    // "%PDF" in base64 starts with "JVBERi"
    if (head && !head.startsWith('JVBERi')) {
      throw new Error(
        'Catalogue file is not a valid PDF. Re-upload the PDF in Settings.'
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes('not a valid pdf')
    ) {
      throw error;
    }
    // Some platforms ignore length/position — rely on size check above.
  }
}

/**
 * Build a shareable on-disk .pdf with the catalogue filename so the system
 * share sheet / WhatsApp treat it as a PDF document (not an image or link).
 */
async function prepareCatalogPdfDocument(
  storedUri: string,
  filename: string
): Promise<string> {
  const sourceUri = await ensureShareableMurtiesPdfUri(storedUri);
  await assertValidPdfFile(sourceUri);

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File storage is unavailable on this device.');
  }

  const downloadDir = `${cacheDir}Download/`;
  try {
    await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
  } catch {
    // may exist
  }

  const safeBase =
    filename
      .replace(/\.pdf$/i, '')
      .replace(/[^\w.-]+/g, '_')
      .trim() || 'Ganesha_Murties_Catalog';
  const dest = `${downloadDir}${safeBase}.pdf`;

  const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
  const existing = await FileSystem.getInfoAsync(dest);
  const sameFile =
    existing.exists &&
    !existing.isDirectory &&
    typeof existing.size === 'number' &&
    typeof sourceInfo.size === 'number' &&
    existing.size === sourceInfo.size;

  if (!sameFile) {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  }

  await assertValidPdfFile(dest);
  return dest.startsWith('file://') ? dest : `file://${dest}`;
}

/**
 * Attach the prepared catalogue PDF into THIS contact's WhatsApp chat.
 * Same PDF file as before — only the open target changes (jid / phone).
 */
async function shareCatalogPdfToContact(params: {
  pdfUri: string;
  phone: string;
  filename: string;
  appKind: WhatsAppAppKind;
}): Promise<void> {
  const { pdfUri, phone, filename, appKind } = params;
  await shareWhatsAppMedia({
    title: 'Share catalogue PDF',
    phone,
    appKind,
    url: pdfUri,
    type: 'application/pdf',
    filename,
    // Never caption — text path can drop the PDF.
    message: undefined,
    targetPhone: true,
    // Keep the prepared catalogue file as-is (no multi-MB re-copy).
    useInternalStorage: false,
  });
}

/**
 * Tele-Messaging → Send catalogue:
 * Prepares the Settings catalogue as a valid .pdf and opens WhatsApp directly
 * to the viewed contact with that PDF attached.
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

  const appKind = await resolveInstalledWhatsAppApp();
  if (!appKind) {
    showWhatsAppMissingAlert();
    return;
  }

  let documentUri: string;
  try {
    documentUri = await prepareCatalogPdfDocument(
      resolved.murtiesPdfUri,
      filename
    );
  } catch (error) {
    console.warn('Could not prepare Settings catalog PDF for WhatsApp', error);
    Alert.alert(
      'PDF Attach Failed',
      error instanceof Error
        ? error.message
        : 'Could not prepare the catalog PDF from Settings. Re-upload it in Settings and try again.'
    );
    return;
  }

  try {
    await shareCatalogPdfToContact({
      pdfUri: documentUri,
      phone,
      filename,
      appKind,
    });
  } catch (error) {
    if (isUserCancelledShare(error)) return;
    const alternate: WhatsAppAppKind =
      appKind === 'consumer' ? 'business' : 'consumer';
    try {
      await shareCatalogPdfToContact({
        pdfUri: documentUri,
        phone,
        filename,
        appKind: alternate,
      });
      return;
    } catch (retryError) {
      if (isUserCancelledShare(retryError)) return;
      console.warn('Catalogue WhatsApp share failed', retryError);
      Alert.alert(
        'WhatsApp Failed',
        error instanceof Error
          ? error.message
          : 'Could not share the catalogue PDF. Please try again.'
      );
    }
  }
}
