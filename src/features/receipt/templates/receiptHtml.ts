import { Booking } from '@/types/booking';
import { BusinessDocumentSettings } from '@/types/settings';
import { nativePdfHtmlShell } from '../utils/nativePdfAssets';
import { buildReceiptHtmlBody } from './receiptHtmlBody';

export function buildReceiptHtml(
  booking: Booking,
  settings: BusinessDocumentSettings,
  qrMarkup: string,
  logoMarkup: string,
  forNativePdf = false
): string {
  const body = buildReceiptHtmlBody(
    booking,
    settings,
    qrMarkup,
    logoMarkup,
    forNativePdf
  );

  if (forNativePdf) {
    return nativePdfHtmlShell(body);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:4px;background-color:#FFF8E8;font-family:Arial,Helvetica,sans-serif;color:#3E2723;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
${body}
</body>
</html>`;
}
