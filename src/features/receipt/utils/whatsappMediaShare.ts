import {
  Platform,
  TurboModuleRegistry,
  type TurboModule,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import Share from 'react-native-share';
import {
  openDeviceWhatsAppApp,
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

const SHARE_TIMEOUT_MS = 12_000;

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
 * iOS cannot attach files to WhatsApp without the system share / Open In sheet
 * (Messages vs WhatsApp). Always open the customer chat directly instead.
 */
async function openIosWhatsAppChat(params: {
  phone: string;
  appKind: WhatsAppAppKind;
  title: string;
  message?: string;
  targetPhone: boolean;
}): Promise<void> {
  if (!params.targetPhone) {
    // Follow-up attach would show Messages vs WhatsApp — skip it.
    return;
  }

  const text =
    params.message?.trim() ||
    params.title.trim() ||
    '🙏 Shared from Ganeshay';

  await openDeviceWhatsAppApp(params.phone, text, params.appKind);
}

/**
 * Share a single file to WhatsApp / WhatsApp Business (Android + iOS).
 *
 * Android: native package Intent — opens WhatsApp directly with the file.
 * iOS: open the customer WhatsApp chat directly (no Messages/WhatsApp sheet).
 *      iOS has no public API to attach a PDF/image to WhatsApp without that sheet.
 */
export async function shareWhatsAppMedia(
  params: WhatsAppMediaShareParams
): Promise<void> {
  const social = whatsAppSocialForKind(Share, params.appKind);
  const targetPhone = params.targetPhone !== false;
  const message = params.message?.trim() ? params.message : undefined;
  const filename = filenameWithoutExtension(params.filename, params.type);

  if (Platform.OS === 'ios') {
    await openIosWhatsAppChat({
      phone: params.phone,
      appKind: params.appKind,
      title: params.title,
      message,
      targetPhone,
    });
    return;
  }

  const url = await prepareShareableFileUrl(
    params.url,
    params.type,
    params.filename
  );

  // Android: bypass normalizeSingleShareOptions (url → urls / SEND_MULTIPLE).
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
  // Never use forceDialog for the default path — that shows a system chooser
  // (Messages / WhatsApp). Only when the caller explicitly requests it.
  if (params.forceDialog) {
    options.forceDialog = true;
  }

  await withTimeout(
    NativeRNShare.shareSingle(options),
    SHARE_TIMEOUT_MS,
    'WhatsApp share timed out. Please try again.'
  );
}
