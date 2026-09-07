/**
 * Queue + promise API for rendering receipt HTML to a PNG file via a hidden
 * WebView host (ReceiptImageCaptureHost). Used on Android WhatsApp share
 * because document (PDF) EXTRA_STREAM is silently dropped by WhatsApp.
 */

export type ReceiptImageCaptureRequest = {
  html: string;
  filename: string;
  resolve: (fileUri: string) => void;
  reject: (error: Error) => void;
};

type CaptureHandler = (request: ReceiptImageCaptureRequest) => void;

let handler: CaptureHandler | null = null;
const pending: ReceiptImageCaptureRequest[] = [];

export function registerReceiptImageCaptureHandler(
  next: CaptureHandler | null
): void {
  handler = next;
  if (!handler) return;
  while (pending.length > 0) {
    const request = pending.shift();
    if (request) handler(request);
  }
}

/**
 * Render invoice HTML to a shareable file:// PNG (high quality).
 * Requires ReceiptImageCaptureHost mounted in the app root.
 */
export function captureReceiptHtmlToPng(
  html: string,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request: ReceiptImageCaptureRequest = {
      html,
      filename,
      resolve,
      reject,
    };
    if (handler) {
      handler(request);
      return;
    }
    pending.push(request);
    // Host should mount at app start; fail if it never does.
    setTimeout(() => {
      const index = pending.indexOf(request);
      if (index < 0) return;
      pending.splice(index, 1);
      reject(
        new Error(
          'Receipt image capture is not ready. Rebuild and reopen the app, then try again.'
        )
      );
    }, 8000);
  });
}
