import { Booking } from '@/types/booking';
import { BusinessDocumentSettings } from '@/types/settings';
import { formatCurrency } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/dates';
import {
  BAPPAJI_LOGO_SVG,
  svgToDataUri,
  DEFAULT_ADDRESS,
  DEFAULT_PHONES,
} from '../assets/receiptAssets';

const BRAND_TAGLINE = 'Eco-friendly Shree Ganesha Murti';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReceiptHtml(
  booking: Booking,
  settings: BusinessDocumentSettings,
  qrDataUrl: string
): string {
  const tagline = escapeHtml(BRAND_TAGLINE);
  const phone = escapeHtml(settings.phone || DEFAULT_PHONES);
  const address = escapeHtml(settings.address || DEFAULT_ADDRESS);
  const invoiceNo = escapeHtml(`INV-${booking.booking_number}`);
  const bookingId = escapeHtml(booking.booking_number);
  const bookingDate = escapeHtml(formatDisplayDate(booking.booking_date));
  const customerName = escapeHtml(booking.customer_name);
  const mobile = escapeHtml(booking.mobile);
  const murtiName = escapeHtml(booking.murti_name);
  const total = escapeHtml(formatCurrency(booking.price));
  const advance = escapeHtml(formatCurrency(booking.advance));
  const pending = escapeHtml(formatCurrency(booking.pending));
  const status = escapeHtml(booking.status);
  const paymentMode = booking.payment_mode
    ? escapeHtml(booking.payment_mode)
    : '';
  const notes = booking.notes ? escapeHtml(booking.notes) : '';

  const logoSrc = settings.businessLogo
    ? settings.businessLogo
    : svgToDataUri(BAPPAJI_LOGO_SVG);

  const statusBg = booking.status === 'Delivered' ? '#E8F5E9' : '#FFF3E0';
  const statusColor = booking.status === 'Delivered' ? '#2E7D32' : '#E65100';

  const paymentRow = paymentMode
    ? `<tr>
        <td style="padding:7px 0;border-top:1px dotted #E8DFD4;font-size:13px;color:#6B5344;font-weight:600;width:38%;">Payment</td>
        <td style="padding:7px 0;border-top:1px dotted #E8DFD4;font-size:16px;color:#2C1810;font-weight:700;">${paymentMode}</td>
      </tr>`
    : '';

  const notesBlock = notes
    ? `<strong style="color:#B22234;">Notes:</strong> ${notes}`
    : 'Thank you for your booking. Please keep this invoice for delivery and payment reference.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
</head>
<body style="margin:0;padding:8px;background-color:#FFFAF5;font-family:Arial,Helvetica,sans-serif;color:#2C1810;">

<div id="invoice-root" style="width:680px;margin:0 auto;">

  <table width="680" cellpadding="0" cellspacing="0" style="border:3px double #D4AF37;background-color:#FFFAF5;">
    <tr>
      <td style="padding:4px;">

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #B22234;background-color:#FFFFFF;">
          <tr>
            <td style="padding:20px 22px;">

              <!-- BRAND HEADER -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:14px;border-bottom:2px solid #F4E4BC;">

                    <table cellpadding="0" cellspacing="0" align="center" style="margin-bottom:10px;">
                      <tr>
                        <td align="center" style="background-color:#FFFAF5;border:2px solid #D4AF37;border-radius:12px;padding:10px 20px;">
                          <img src="${logoSrc}" alt="${tagline}" style="height:78px;max-width:220px;display:block;" />
                        </td>
                      </tr>
                    </table>

                    <div style="font-size:19px;font-weight:bold;color:#B22234;line-height:1.35;margin-bottom:8px;">${tagline}</div>
                    <div style="font-size:13px;color:#6B5344;line-height:1.55;">${address}<br/>Phone: ${phone}</div>

                  </td>
                </tr>
              </table>

              <!-- INVOICE TITLE -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:14px 0 16px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color:#B22234;color:#FFFFFF;font-size:17px;font-weight:bold;letter-spacing:2px;padding:9px 34px;border:1px solid #D4AF37;">
                          BOOKING INVOICE
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- BILL TO + INVOICE DETAILS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right:6px;">

                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8DFD4;border-radius:8px;">
                      <tr>
                        <td style="background-color:#FF8C00;color:#FFFFFF;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:8px 12px;">Bill To</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 12px;background-color:#FFFAF5;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:3px 0;font-size:13px;color:#6B5344;font-weight:600;width:38%;">Customer</td>
                              <td style="padding:3px 0;font-size:16px;color:#2C1810;font-weight:700;">${customerName}</td>
                            </tr>
                            <tr>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;font-size:13px;color:#6B5344;font-weight:600;">Mobile</td>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;font-size:16px;color:#2C1810;font-weight:700;">${mobile}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                  <td width="50%" valign="top" style="padding-left:6px;">

                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8DFD4;border-radius:8px;">
                      <tr>
                        <td style="background-color:#FF8C00;color:#FFFFFF;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:8px 12px;">Invoice Details</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 12px;background-color:#FFFAF5;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:3px 0;font-size:13px;color:#6B5344;font-weight:600;width:42%;">Booking ID</td>
                              <td style="padding:3px 0;font-size:16px;color:#2C1810;font-weight:700;">${bookingId}</td>
                            </tr>
                            <tr>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;font-size:13px;color:#6B5344;font-weight:600;">Invoice No.</td>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;font-size:16px;color:#2C1810;font-weight:700;">${invoiceNo}</td>
                            </tr>
                            <tr>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;font-size:13px;color:#6B5344;font-weight:600;">Date</td>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;font-size:16px;color:#2C1810;font-weight:700;">${bookingDate}</td>
                            </tr>
                            <tr>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;font-size:13px;color:#6B5344;font-weight:600;">Status</td>
                              <td style="padding:7px 0 3px 0;border-top:1px dotted #E8DFD4;">
                                <span style="background-color:${statusBg};color:${statusColor};font-size:12px;font-weight:bold;padding:3px 10px;border-radius:10px;text-transform:uppercase;">${status}</span>
                              </td>
                            </tr>
                            ${paymentRow}
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- LINE ITEMS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D4AF37;margin-bottom:14px;">
                <tr style="background-color:#B22234;">
                  <th align="left" style="color:#FFFFFF;font-size:13px;font-weight:bold;text-transform:uppercase;padding:9px 12px;border-right:1px solid #9B1B2F;">Description</th>
                  <th align="center" style="color:#FFFFFF;font-size:13px;font-weight:bold;text-transform:uppercase;padding:9px 8px;width:52px;border-right:1px solid #9B1B2F;">Qty</th>
                  <th align="right" style="color:#FFFFFF;font-size:13px;font-weight:bold;text-transform:uppercase;padding:9px 8px;width:96px;border-right:1px solid #9B1B2F;">Rate</th>
                  <th align="right" style="color:#FFFFFF;font-size:13px;font-weight:bold;text-transform:uppercase;padding:9px 12px;width:104px;">Amount</th>
                </tr>
                <tr style="background-color:#FFFFFF;">
                  <td style="padding:11px 12px;border-top:1px solid #F0E6DA;">
                    <div style="font-size:16px;font-weight:bold;color:#B22234;">${murtiName}</div>
                    <div style="font-size:12px;color:#6B5344;margin-top:3px;">Ganapati Murti Booking &bull; ${bookingDate}</div>
                  </td>
                  <td align="center" style="padding:11px 8px;border-top:1px solid #F0E6DA;font-size:15px;font-weight:600;">1</td>
                  <td align="right" style="padding:11px 8px;border-top:1px solid #F0E6DA;font-size:15px;font-weight:700;">${total}</td>
                  <td align="right" style="padding:11px 12px;border-top:1px solid #F0E6DA;font-size:15px;font-weight:700;">${total}</td>
                </tr>
              </table>

              <!-- NOTES + PAYMENT SUMMARY -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="54%" valign="top" style="padding-right:10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#FFFAF5;border-left:3px solid #FF8C00;padding:10px 12px;font-size:13px;color:#6B5344;line-height:1.55;">
                          ${notesBlock}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="46%" valign="top">

                    <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #D4AF37;">
                      <tr>
                        <td colspan="2" align="center" style="background-color:#FFF8F0;padding:8px 12px;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#8B0000;border-bottom:1px solid #F4E4BC;">Payment Summary</td>
                      </tr>
                      <tr style="background-color:#FFFFFF;">
                        <td style="padding:8px 12px;font-size:15px;color:#6B5344;font-weight:600;border-bottom:1px solid #F0E6DA;">Subtotal</td>
                        <td align="right" style="padding:8px 12px;font-size:15px;font-weight:700;border-bottom:1px solid #F0E6DA;">${total}</td>
                      </tr>
                      <tr style="background-color:#FFFFFF;">
                        <td style="padding:8px 12px;font-size:15px;color:#6B5344;font-weight:600;border-bottom:1px solid #F0E6DA;">Advance Paid</td>
                        <td align="right" style="padding:8px 12px;font-size:15px;font-weight:700;border-bottom:1px solid #F0E6DA;">${advance}</td>
                      </tr>
                      <tr style="background-color:#FFF0E0;">
                        <td style="padding:9px 12px;font-size:16px;color:#B22234;font-weight:bold;">Balance Due</td>
                        <td align="right" style="padding:9px 12px;font-size:20px;color:#FF8C00;font-weight:bold;">${pending}</td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- TERMS + QR -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #F4E4BC;padding-top:12px;">
                <tr>
                  <td width="66%" valign="middle" style="padding-right:10px;font-size:13px;color:#6B5344;line-height:1.55;">
                    <strong style="color:#B22234;">Terms:</strong> Advance amount is non-refundable. Balance to be paid on delivery. Present this invoice at the time of collection.<br/><br/>
                    <strong style="color:#B22234;">${tagline}</strong> &mdash; ${phone}
                  </td>
                  <td width="34%" align="center" valign="middle">
                    <table cellpadding="0" cellspacing="0" align="center" style="background-color:#FFFAF5;border:1px solid #D4AF37;border-radius:8px;">
                      <tr>
                        <td align="center" style="padding:7px;">
                          <img src="${qrDataUrl}" alt="QR" style="width:78px;height:78px;display:block;" />
                          <div style="font-size:11px;color:#6B5344;font-weight:600;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Scan Reference</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:2px solid #D4AF37;padding-top:12px;">
                <tr>
                  <td align="center">
                    <div style="font-size:16px;font-weight:bold;color:#B22234;margin-bottom:4px;">Thank you for your booking!</div>
                    <div style="font-size:15px;font-weight:bold;color:#FF8C00;margin-bottom:5px;">Ganpati Bappa Morya!</div>
                    <div style="font-size:11px;color:#6B5344;">Computer-generated invoice &bull; ${tagline}</div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</div>
</body>
</html>`;
}
