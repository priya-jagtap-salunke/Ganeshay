import { Platform, Linking, Alert } from 'react-native';
import { getWhatsAppAppUrl } from './whatsappMessage';

const WHATSAPP_PACKAGE = 'com.whatsapp';
const WHATSAPP_BUSINESS_PACKAGE = 'com.whatsapp.w4b';

export type WhatsAppAppKind = 'consumer' | 'business';

async function isWhatsAppSchemeAvailable(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('whatsapp://send');
  } catch {
    return false;
  }
}

/**
 * Resolve which WhatsApp app to open.
 * Prefer WhatsApp Business when installed (many vendors use it as primary);
 * otherwise WhatsApp. Avoids opening Facebook Messenger or a generic share sheet.
 */
export async function resolveInstalledWhatsAppApp(): Promise<WhatsAppAppKind | null> {
  if (Platform.OS === 'android') {
    try {
      const Share = (await import('react-native-share')).default;
      const business = await Share.isPackageInstalled(WHATSAPP_BUSINESS_PACKAGE);
      if (business.isInstalled) return 'business';
      const consumer = await Share.isPackageInstalled(WHATSAPP_PACKAGE);
      if (consumer.isInstalled) return 'consumer';
      return null;
    } catch {
      // Fall through to scheme check
    }
  }

  const schemeOk = await isWhatsAppSchemeAvailable();
  return schemeOk ? 'consumer' : null;
}

export function whatsAppSocialForKind(
  Share: { Social: { WHATSAPP: unknown; WHATSAPPBUSINESS: unknown } },
  appKind: WhatsAppAppKind
) {
  return appKind === 'business'
    ? Share.Social.WHATSAPPBUSINESS
    : Share.Social.WHATSAPP;
}

export function showWhatsAppMissingAlert(): void {
  Alert.alert(
    'WhatsApp Not Installed',
    'Please install WhatsApp or WhatsApp Business to share with your customer.'
  );
}

/** Open the installed WhatsApp package directly (no Messenger / share sheet). */
export async function openDeviceWhatsAppApp(
  phone: string,
  message: string
): Promise<void> {
  const appUrl = getWhatsAppAppUrl(phone, message);
  const encodedText = encodeURIComponent(message);
  const installed = await resolveInstalledWhatsAppApp();

  if (!installed) {
    showWhatsAppMissingAlert();
    return;
  }

  if (Platform.OS === 'android') {
    const packageName =
      installed === 'business' ? WHATSAPP_BUSINESS_PACKAGE : WHATSAPP_PACKAGE;
    const intentUrl =
      `intent://send?phone=${phone}&text=${encodedText}` +
      `#Intent;scheme=whatsapp;package=${packageName};end`;

    try {
      await Linking.openURL(intentUrl);
      return;
    } catch {
      // Fall through to whatsapp://
    }
  }

  await Linking.openURL(appUrl);
}
