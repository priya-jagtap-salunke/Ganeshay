import {
  Platform,
  TurboModuleRegistry,
  type TurboModule,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import Share from 'react-native-share';
import {
  whatsAppSocialForKind,
  type WhatsAppAppKind,
} from './whatsappApp';

interface RNShareNativeModule extends TurboModule {
  shareSingle: (
    options: Record<string, unknown>
  ) => Promise<{ success: boolean; message: string }>;
}

export type WhatsAppMediaShareParams = {
  title: string;
  phone: string;
  appKind: WhatsAppAppKind;
  /** Must be a real file:// or data: URI so Android uses EXTRA_STREAM (never path-as-text). */
  url: string;
  type: string;
  filename?: string;
  /**
   * Optional caption. On media-follow-up after openDeviceWhatsAppApp,
   * omit this — EXTRA_TEXT + EXTRA_STREAM often drops the file.
   * Never set for catalogue/invoice PDFs.
   */
  message?: string;
  /**
   * When true (default), open the customer's chat with the file attached.
   * Set false only for follow-up attaches into an already-open chat.
   */
  targetPhone?: boolean;
  /**
   * Android: show a chooser and wait for the result instead of fire-and-forget
   * startActivity (needed for some PDF edge cases).
   */
  forceDialog?: boolean;
};

const SHARE_TIMEOUT_MS = 8_000;

function ensureFileUrl(uri: string): string {
  if (
    uri.startsWith('data:') ||
    uri.startsWith('file://') ||
    uri.startsWith('content://')
  ) {
    return uri;
  }
  return `file://${uri}`;
}

/** RN Share base64 writer appends `.<ext>` from MIME — strip any existing ext. */
function filenameWithoutExtension(
  filename: string | undefined,
  type: string
): string | undefined {
  if (!filename) return undefined;
  if (type === 'application/pdf') {
    return filename.replace(/\.pdf$/i, '') || 'document';
  }
  return filename.replace(/\.(png|jpe?g|webp|gif)$/i, '') || filename;
}

function extensionForMime(type: string): string {
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  return 'bin';
}

function isPdfShare(type: string, url: string): boolean {
  return type === 'application/pdf' || url.toLowerCase().includes('.pdf');
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Put the file under cache/Download with a stable extension (Android FileProvider
 * + iOS WhatsApp document share both prefer a real on-disk file:// URI).
 *
 * Skip re-copy when the file is already a local path with a real extension —
 * catalogue PDFs can be 50–150 MB and copying twice made Send look "stuck".
 */
async function prepareShareableFileUrl(
  url: string,
  type: string,
  filename?: string
): Promise<string> {
  const normalized = ensureFileUrl(url);
  if (normalized.startsWith('data:')) {
    return normalized;
  }

  const fileUri = normalized;
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.isDirectory) {
    throw new Error('Share file was not found on device.');
  }
  if (typeof info.size === 'number' && info.size < 64) {
    throw new Error('Share file is empty or incomplete.');
  }

  // Already a real local file with extension — share in place (no multi-MB copy).
  if (/\.(pdf|png|jpe?g|webp|gif)$/i.test(fileUri)) {
    return fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
  }

  const downloadDir = `${cacheDir}Download/`;
  try {
    await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
  } catch {
    // may exist
  }

  const base =
    (filename || 'share')
      .replace(/\.(pdf|png|jpe?g|webp|gif)$/i, '')
      .replace(/[^\w.-]+/g, '_') || 'share';
  const dest = `${downloadDir}${base}_${Date.now()}.${extensionForMime(type)}`;
  await FileSystem.copyAsync({ from: fileUri, to: dest });

  const copied = await FileSystem.getInfoAsync(dest);
  if (!copied.exists || (typeof copied.size === 'number' && copied.size < 64)) {
    throw new Error('Could not prepare file for WhatsApp share.');
  }

  return dest.startsWith('file://') ? dest : `file://${dest}`;
}

/**
 * Share a single file to WhatsApp / WhatsApp Business (Android + iOS).
 *
 * Same behavior on both platforms:
 * - Opens the customer's WhatsApp chat when targetPhone is true
 * - Attaches the PDF / image (no text-only substitute)
 * - Android: package Intent with EXTRA_STREAM
 * - iOS: patched WhatsAppShare (customer chat + WhatsApp document/image UTI)
 */
export async function shareWhatsAppMedia(
  params: WhatsAppMediaShareParams
): Promise<void> {
  const social = whatsAppSocialForKind(Share, params.appKind);
  const targetPhone = params.targetPhone !== false;
  const isPdf = isPdfShare(params.type, params.url);
  // Never caption PDFs — EXTRA_TEXT / iOS text path drops or replaces the file.
  const message =
    !isPdf && params.message?.trim() ? params.message : undefined;
  const filename = filenameWithoutExtension(params.filename, params.type);
  const url = await prepareShareableFileUrl(
    params.url,
    params.type,
    params.filename
  );

  if (Platform.OS === 'android') {
    const NativeRNShare =
      TurboModuleRegistry.getEnforcing<RNShareNativeModule>('RNShare');

    const options: Record<string, unknown> = {
      title: params.title,
      social,
      url,
      type: params.type,
      useInternalStorage: true,
    };
    if (filename) options.filename = filename;
    if (message) options.message = message;
    if (targetPhone) options.whatsAppNumber = params.phone;
    if (params.forceDialog) {
      options.forceDialog = true;
    }

    await withTimeout(
      NativeRNShare.shareSingle(options),
      SHARE_TIMEOUT_MS,
      'WhatsApp share timed out. Please try again.'
    );
    return;
  }

  // iOS — same customer-targeted file share as Android (patched native module).
  // Resolve quickly: native presents WhatsApp / Open In and returns; a long wait
  // made the UI look "stuck loading" even after WhatsApp opened.
  try {
    await withTimeout(
      Share.shareSingle({
        title: params.title,
        social: Share.Social.WHATSAPP,
        url,
        type: params.type,
        ...(filename ? { filename } : {}),
        ...(message ? { message } : {}),
        ...(targetPhone ? { whatsAppNumber: params.phone } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      3000,
      'WhatsApp share launched'
    );
  } catch (error) {
    const msg = (
      error instanceof Error ? error.message : String(error)
    ).toLowerCase();
    // Native may not settle the promise after presenting WhatsApp — treat as OK.
    if (msg.includes('launched') || msg.includes('timed out')) {
      return;
    }
    throw error;
  }
}
