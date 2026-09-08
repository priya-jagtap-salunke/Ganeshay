import { Platform, Linking, Alert } from 'react-native';

const WHATSAPP_PACKAGE = 'com.whatsapp';
const WHATSAPP_BUSINESS_PACKAGE = 'com.whatsapp.w4b';

export type WhatsAppAppKind = 'consumer' | 'business';

/** Digits-only E.164-style number for WhatsApp deep links / jid (no +, spaces). */
export function whatsAppPhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

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
  // react-native-share WHATSAPPBUSINESS document share is Android-only.
  // On iOS always use WHATSAPP so invoice/catalog PDF attach matches Android.
  if (Platform.OS === 'ios') {
    return Share.Social.WHATSAPP;
  }
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
 * Open WhatsApp / WhatsApp Business directly to THIS contact's chat with text.
 * Never shows WhatsApp's "Send to" contact picker — phone is in the deep link.
 * Never uses https://wa.me (browser “Open in WhatsApp?” prompt).
 */
export async function openDeviceWhatsAppApp(
  phone: string,
  message: string,
  appKind?: WhatsAppAppKind
): Promise<void> {
  const digits = whatsAppPhoneDigits(phone);
  const encodedText = encodeURIComponent(message);
  const installed = appKind ?? (await resolveInstalledWhatsAppApp());

  if (!installed) {
    showWhatsAppMissingAlert();
    return;
  }

  if (!digits || digits.length < 10) {
    Alert.alert(
      'Invalid Mobile',
      'Customer mobile number is missing or invalid.'
    );
    return;
  }

  // Deep link with phone → opens that chat only (no contact re-select).
  const consumerUrl = `whatsapp://send?phone=${digits}&text=${encodedText}`;
  const businessUrl = `whatsapp-business://send?phone=${digits}&text=${encodedText}`;

  if (Platform.OS === 'android') {
    const packageName =
      installed === 'business' ? WHATSAPP_BUSINESS_PACKAGE : WHATSAPP_PACKAGE;
    // Package-scoped intent keeps the same contact; avoid generic ACTION_SEND.
    const intentUrl =
      `intent://send?phone=${digits}&text=${encodedText}` +
      `#Intent;scheme=whatsapp;package=${packageName};end`;

    try {
      await Linking.openURL(intentUrl);
      return;
    } catch {
      // Fall through to scheme URLs
    }
  }

  const candidates =
    installed === 'business'
      ? [businessUrl, consumerUrl]
      : [consumerUrl, businessUrl];

  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // try next scheme
    }
  }

  showWhatsAppMissingAlert();
}
