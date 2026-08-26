import { Platform, Linking, Alert } from 'react-native';
import { getWhatsAppAppUrl } from './whatsappMessage';

const WHATSAPP_PACKAGE = 'com.whatsapp';
const WHATSAPP_BUSINESS_PACKAGE = 'com.whatsapp.w4b';

export type WhatsAppAppKind = 'consumer' | 'business';

async function canOpenWhatsAppScheme(url: string): Promise<boolean> {
  try {
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
}

/**
 * Resolve which WhatsApp app to open.
 * Prefer WhatsApp Business when installed (many vendors use it as primary);
 * otherwise WhatsApp. Avoids opening Facebook Messenger or a generic share sheet.
 * Android uses package checks; iOS uses LSApplicationQueriesSchemes (whatsapp /
 * whatsapp-business).
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

  if (await canOpenWhatsAppScheme('whatsapp-business://send')) {
    return 'business';
  }
  if (await canOpenWhatsAppScheme('whatsapp://send')) {
    return 'consumer';
  }
  return null;
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

/**
 * Open WhatsApp / WhatsApp Business directly to a chat with prefilled text.
 * Pass `appKind` when the caller already resolved the package so message +
 * follow-up image shares target the same app.
 */
export async function openDeviceWhatsAppApp(
  phone: string,
  message: string,
  appKind?: WhatsAppAppKind
): Promise<void> {
  const encodedText = encodeURIComponent(message);
  const installed = appKind ?? (await resolveInstalledWhatsAppApp());

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
      // Fall through to scheme URLs
    }
  }

  if (installed === 'business') {
    try {
      await Linking.openURL(
        `whatsapp-business://send?phone=${phone}&text=${encodedText}`
      );
      return;
    } catch {
      // Fall through to consumer whatsapp://
    }
  }

  await Linking.openURL(getWhatsAppAppUrl(phone, message));
}
