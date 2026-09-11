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
  resolvePersistedMurtiesPdfUri,
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

async function assertValidPdfFile(fileUri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.isDirectory) {
    throw new Error('Catalogue PDF file was not found on device.');
  }
  if (typeof info.size !== 'number' || info.size < 64) {
    throw new Error('Catalogue PDF is empty or incomplete.');
  }
  // Do not read large PDF bodies into JS — that OOMs Send for big catalogues.
  return info.size;
}

/**
 * Build a shareable on-disk .pdf from the complete Settings catalogue.
 * Places the file under cache/Download so WhatsApp FileProvider can serve it.
 */
async function prepareCatalogPdfDocument(
  storedUri: string,
  filename: string
): Promise<string> {
  // ensureShareable copies into cache/Download/murties-catalog-share.pdf
  // (RN Share FileProvider covers cache-path, not documentDirectory).
  const sourceUri = await ensureShareableMurtiesPdfUri(storedUri);
  const sourceSize = await assertValidPdfFile(sourceUri);

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

  // Already the shareable cache copy — use as-is.
  if (
    sourceUri.replace(/\\/g, '/').toLowerCase().endsWith('/murties-catalog-share.pdf')
  ) {
    return sourceUri.startsWith('file://') ? sourceUri : `file://${sourceUri}`;
  }

  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    // ignore
  }
  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  const destSize = await assertValidPdfFile(dest);
  if (destSize < sourceSize * 0.9) {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    throw new Error(
      'Catalogue PDF copy was incomplete. Please try Send catalogue again.'
    );
  }

  return dest.startsWith('file://') ? dest : `file://${dest}`;
}

/**
 * Attach the prepared catalogue PDF into THIS contact's WhatsApp chat.
 */
async function shareCatalogPdfToContact(params: {
  pdfUri: string;
  phone: string;
  filename: string;
  appKind: WhatsAppAppKind;
}): Promise<void> {
  const { pdfUri, phone, filename, appKind } = params;
  console.warn('[CatalogueShare] attaching PDF', {
    phone,
    appKind,
    pdfUri,
    filename,
  });
  await shareWhatsAppMedia({
    title: 'Share catalogue PDF',
    phone,
    appKind,
    url: pdfUri,
    type: 'application/pdf',
    filename,
    message: undefined,
    targetPhone: true,
    // File is already under cache/Download (FileProvider cache-path).
    // Avoid a second multi-MB internal copy that hangs large catalogues.
    useInternalStorage: false,
    timeoutMs: 120_000,
  });
}

/**
 * Tele-Messaging → Send catalogue:
 * Shares the complete Catalogue PDF from Settings as a real .pdf into the
 * viewed contact's WhatsApp chat (no manual contact search).
 * @returns true when share launched successfully
 */
export async function shareCatalogOnWhatsApp(
  recipient: TeleMessagingShareRecipient,
  settings?: BusinessSettings | null
): Promise<boolean> {
  const phone = formatWhatsAppPhone(recipient.mobile);
  const resolved = resolveCatalogSettings(settings);
  const filename = catalogFilename(resolved);

  if (!phone) {
    Alert.alert('Invalid Mobile', 'Customer mobile number is missing or invalid.');
    return false;
  }

  // Heal Settings URI from the canonical on-disk file when needed.
  const liveStored =
    useSettingsStore.getState().murtiesPdfUri ?? resolved.murtiesPdfUri;
  const resolvedUri = await resolvePersistedMurtiesPdfUri(liveStored);
  if (!resolvedUri) {
    Alert.alert(
      'Catalog Missing',
      'Upload the Ganesh Murti catalog PDF in Settings, then try again.'
    );
    return false;
  }
  if (resolvedUri !== liveStored) {
    useSettingsStore.getState().updateSettings({
      murtiesPdfUri: resolvedUri,
      murtiesPdfName:
        useSettingsStore.getState().murtiesPdfName ??
        resolved.murtiesPdfName ??
        filename,
    });
  }

  if (Platform.OS === 'web') {
    await downloadMurtiesPdfOnWeb(resolvedUri, filename);
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
    return true;
  }

  const appKind = await resolveInstalledWhatsAppApp();
  if (!appKind) {
    showWhatsAppMissingAlert();
    return false;
  }

  let documentUri: string;
  try {
    documentUri = await prepareCatalogPdfDocument(resolvedUri, filename);
    console.warn('[CatalogueShare] prepared PDF', documentUri);
  } catch (error) {
    console.warn('Could not prepare Settings catalog PDF for WhatsApp', error);
    Alert.alert(
      'PDF Attach Failed',
      error instanceof Error
        ? error.message
        : 'Could not prepare the catalog PDF from Settings. Re-upload it in Settings and try again.'
    );
    return false;
  }

  try {
    await shareCatalogPdfToContact({
      pdfUri: documentUri,
      phone,
      filename,
      appKind,
    });
    return true;
  } catch (error) {
    if (isUserCancelledShare(error)) return false;
    const alternate: WhatsAppAppKind =
      appKind === 'consumer' ? 'business' : 'consumer';
    try {
      await shareCatalogPdfToContact({
        pdfUri: documentUri,
        phone,
        filename,
        appKind: alternate,
      });
      return true;
    } catch (retryError) {
      if (isUserCancelledShare(retryError)) return false;
      // Last resort: system share sheet still attaches the real PDF document.
      try {
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          console.warn('[CatalogueShare] falling back to system share sheet');
          await Sharing.shareAsync(documentUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share catalogue PDF',
            UTI: 'com.adobe.pdf',
          });
          return true;
        }
      } catch (shareSheetError) {
        if (isUserCancelledShare(shareSheetError)) return false;
        console.warn('Catalogue system share failed', shareSheetError);
      }
      console.warn('Catalogue WhatsApp share failed', retryError);
      Alert.alert(
        'WhatsApp Failed',
        error instanceof Error
          ? error.message
          : 'Could not share the catalogue PDF. Please try again.'
      );
      return false;
    }
  }
}
