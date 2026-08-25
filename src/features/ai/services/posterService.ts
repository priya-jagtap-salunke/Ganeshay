import { Platform, Share, Linking, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BusinessSettings } from '@/types/settings';
import { PosterBrief } from '../types';
import {
  formatWhatsAppPhone,
  getWhatsAppAppUrl,
  getWhatsAppWebUrl,
} from '@/features/receipt/utils/whatsappMessage';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HTML poster template rendered to PDF via expo-print (same stack as receipts).
 * This is the "Generate posters" deliverable — not DALL·E images.
 */
export function buildPosterHtml(
  brief: PosterBrief,
  settings: Pick<
    BusinessSettings,
    'businessName' | 'phone' | 'address'
  >
): string {
  const style = brief.style ?? 'festive';
  const bg =
    style === 'promo'
      ? 'linear-gradient(160deg, #8B0000 0%, #B22234 45%, #D4AF37 100%)'
      : style === 'greeting'
        ? 'linear-gradient(160deg, #E65100 0%, #B22234 50%, #7A1F2B 100%)'
        : 'linear-gradient(160deg, #B22234 0%, #8B1A28 40%, #D4AF37 100%)';

  const headline = escapeHtml(brief.headline);
  const sub = brief.subheadline ? escapeHtml(brief.subheadline) : '';
  const body = brief.body ? escapeHtml(brief.body) : '';
  const cta = brief.cta ? escapeHtml(brief.cta) : 'Book your murti today';
  const festival = brief.festival ? escapeHtml(brief.festival) : '';
  const business = escapeHtml(settings.businessName || 'Ganeshay Stall');
  const phone = escapeHtml(settings.phone || '');
  const address = escapeHtml(settings.address || '');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      background: #1a1a1a;
    }
    .poster {
      width: 100%;
      min-height: 100vh;
      padding: 48px 40px;
      background: ${bg};
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border: 1px solid rgba(255,255,255,0.55);
      border-radius: 999px;
      font-size: 13px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      font-family: Arial, sans-serif;
    }
    h1 {
      font-size: 48px;
      line-height: 1.15;
      margin: 28px 0 12px;
      font-weight: 700;
    }
    h2 {
      font-size: 22px;
      font-weight: 500;
      margin: 0 0 20px;
      opacity: 0.95;
    }
    .body {
      font-size: 18px;
      line-height: 1.5;
      max-width: 90%;
      opacity: 0.95;
      font-family: Arial, sans-serif;
    }
    .cta {
      margin-top: 36px;
      display: inline-block;
      background: #FFF8F5;
      color: #8B0000;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      font-family: Arial, sans-serif;
    }
    .footer {
      margin-top: 48px;
      border-top: 1px solid rgba(255,255,255,0.35);
      padding-top: 20px;
      font-family: Arial, sans-serif;
    }
    .biz { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    .meta { font-size: 14px; opacity: 0.9; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="poster">
    <div>
      ${festival ? `<div class="badge">${festival}</div>` : `<div class="badge">Ganeshay</div>`}
      <h1>${headline}</h1>
      ${sub ? `<h2>${sub}</h2>` : ''}
      ${body ? `<p class="body">${body}</p>` : ''}
      <div class="cta">${cta}</div>
    </div>
    <div class="footer">
      <div class="biz">${business}</div>
      <div class="meta">
        ${phone ? `☎ ${phone}<br/>` : ''}
        ${address || ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function generatePosterPdf(
  brief: PosterBrief,
  settings: Pick<BusinessSettings, 'businessName' | 'phone' | 'address'>
): Promise<string> {
  const html = buildPosterHtml(brief, settings);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePosterPdf(pdfUri: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = pdfUri;
      anchor.download = 'ganeshay-poster.pdf';
      anchor.click();
    }
    Alert.alert(
      'Poster ready',
      'Poster PDF downloaded. Attach it when sharing on WhatsApp or Instagram.'
    );
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share poster',
    UTI: 'com.adobe.pdf',
  });
}

/** Manual WhatsApp share for drafted text — never auto-sends. */
export async function shareTextViaWhatsApp(
  message: string,
  mobile?: string | null
): Promise<void> {
  const text = message.trim();
  if (!text) return;

  if (mobile?.trim()) {
    const phone = formatWhatsAppPhone(mobile.trim());
    const appUrl = getWhatsAppAppUrl(phone, text);
    const webUrl = getWhatsAppWebUrl(phone, text);
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpen ? appUrl : webUrl);
      return;
    } catch {
      await Linking.openURL(webUrl);
      return;
    }
  }

  if (Platform.OS === 'web') {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    await Linking.openURL(url);
    return;
  }

  try {
    await Share.share({ message: text, title: 'Share message' });
  } catch {
    Alert.alert('Share', 'Could not open the share sheet.');
  }
}

export async function copyTextToClipboard(text: string): Promise<void> {
  // Prefer expo-clipboard if present; otherwise Share sheet / web clipboard
  try {
    // Dynamic optional — package may not be installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard');
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(text);
      return;
    }
  } catch {
    // fall through
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  await Share.share({ message: text });
}
