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
 * Open WhatsApp directly to THIS contact with predrafted text.
 *
 * Never shows:
 * - Message / Open message system chooser
 * - WhatsApp "Send to" contact picker
 * - Browser “Open in WhatsApp?”
 *
 * Uses native WhatsApp package / whatsapp:// deep link with phone in the URL.
 */
export async function openDeviceWhatsAppApp(
  phone: string,
  message: string,
  appKind?: WhatsAppAppKind
): Promise<void> {
  const digits = whatsAppPhoneDigits(phone);
  const text = message ?? '';
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

  // Primary: react-native-share → WhatsApp package only (patched native).
  // Do NOT use Linking intent:// or Share.open — those show Message vs WhatsApp.
  try {
    const Share = (await import('react-native-share')).default;
    const social = whatsAppSocialForKind(Share, installed);
    await Share.shareSingle({
      social,
      message: text.length > 0 ? text : ' ',
      whatsAppNumber: digits,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return;
  } catch (error) {
    console.warn(
      'WhatsApp shareSingle (details) failed; trying scheme deep link',
      error
    );
  }

  // Fallback: scheme deep link only (still WhatsApp-only — never https://wa.me).
  const encodedText = encodeURIComponent(text);
  const consumerUrl = `whatsapp://send?phone=${digits}&text=${encodedText}`;
  const businessUrl = `whatsapp-business://send?phone=${digits}&text=${encodedText}`;
  const candidates =
    installed === 'business'
      ? [businessUrl, consumerUrl]
      : [consumerUrl, businessUrl];

  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // try next
    }
  }

  showWhatsAppMissingAlert();
}
