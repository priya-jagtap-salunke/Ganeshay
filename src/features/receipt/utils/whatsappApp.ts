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
 * Prefer WhatsApp Business when installed; otherwise WhatsApp.
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
 * Send details → open THIS contact in WhatsApp with the full predrafted text.
 *
 * Encodes the complete message (no truncation). Uses only whatsapp:// /
 * package deep links — never Share.open / chooser sheets.
 */
export async function openDeviceWhatsAppApp(
  phone: string,
  message: string,
  appKind?: WhatsAppAppKind
): Promise<void> {
  const digits = whatsAppPhoneDigits(phone);
  // Full Settings / stall message — never truncate or cut off content.
  const encodedText = encodeURIComponent(message ?? '');
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

  const textQuery = encodedText ? `&text=${encodedText}` : '';
  const consumerUrl = `whatsapp://send?phone=${digits}${textQuery}`;
  const businessUrl = `whatsapp-business://send?phone=${digits}${textQuery}`;

  // Android: package-locked intent — WhatsApp only, same contact, no Message app.
  if (Platform.OS === 'android') {
    const packageName =
      installed === 'business' ? WHATSAPP_BUSINESS_PACKAGE : WHATSAPP_PACKAGE;
    const intentUrl =
      `intent://send?phone=${digits}${textQuery}` +
      `#Intent;scheme=whatsapp;package=${packageName};` +
      `action=android.intent.action.VIEW;end`;

    try {
      await Linking.openURL(intentUrl);
      return;
    } catch {
      // Fall through to scheme URLs
    }
  }

  // iOS + Android fallback: scheme opens WhatsApp chat directly (no share sheet).
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
