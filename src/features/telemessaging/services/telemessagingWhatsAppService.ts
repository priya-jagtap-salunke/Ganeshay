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
} from '@/features/receipt/utils/whatsappApp';
import { buildStallDetailsWhatsAppMessage } from '@/features/telecalling/utils/stallDetailsWhatsAppMessage';
import { downloadMurtiesPdfOnWeb } from '@/features/settings/utils/murtiesPdfStorage';
import { useSettingsStore } from '@/features/settings/store/settingsStore';

export interface TeleMessagingShareRecipient {
  mobile: string;
  customerName?: string | null;
}

const DEFAULT_CATALOG_FILENAME = 'Ganesha_Murties_Catalog.pdf';

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
 * Deep link only — never Share / Open In (Message vs Open in WhatsApp).
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
 * Tele-Messaging catalogue — opens this contact with a catalogue note.
 * Deep link only (PDF Share sheets showed Message / Open in WhatsApp).
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

  const caption = `🙏 Ganesh Murti Catalog\n\nPlease find our catalogue (${filename}). Reply here if you need more details.`;
  await openDeviceWhatsAppApp(phone, caption, installedApp);
}
