import { Booking } from '@/types/booking';
import { BusinessDocumentSettings } from '@/types/settings';
import { formatCurrency } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/dates';
import {
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

function radius(forNativePdf: boolean, value: string): string {
  return forNativePdf ? '' : `border-radius:${value};`;
}

function receiptStyles(forNativePdf: boolean): string {
  const r6 = forNativePdf ? '0' : '6px';
  const r8 = forNativePdf ? '0' : '8px';
  const r10 = forNativePdf ? '0' : '10px';
  const r14 = forNativePdf ? '0' : '14px';
  const titleBg = forNativePdf
    ? 'background-color:#7B1E1E;'
    : 'background:linear-gradient(180deg,#8B2424 0%,#7B1E1E 55%,#5E1515 100%);';
  const sectionHeadBg = forNativePdf
    ? 'background-color:#7B1E1E;'
    : 'background:linear-gradient(90deg,#7B1E1E 0%,#9A2E2E 100%);';
  const metaBg = forNativePdf
    ? 'background-color:#FFF3E0;'
    : 'background:linear-gradient(90deg,#FFF8E8 0%,#FBF0D8 100%);';
  const totalRowBg = forNativePdf
    ? 'background-color:#FFF8E8;'
    : 'background:linear-gradient(90deg,#FFF8E8 0%,#FBF0D8 100%);';
  const goldRuleBg = forNativePdf
    ? 'background-color:#D4AF37;'
    : 'background:linear-gradient(90deg,transparent,#D4AF37,transparent);';

  return `<style>
    @page { size: A4; margin: 8mm; }
    #invoice-root {
      --r-primary: #7B1E1E;
      --r-secondary: #F57C00;
      --r-accent: #D4AF37;
      --r-bg: #FFF8E8;
      --r-card: #FFFEF9;
      --r-text: #3E2723;
      --r-muted: #6D4C41;
      --r-serif: Georgia, "Times New Roman", Times, serif;
      --r-sans: Arial, Helvetica, sans-serif;
      width: 680px;
      margin: 0 auto;
      color: var(--r-text);
      font-family: var(--r-sans);
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #invoice-root * { box-sizing: border-box; }
    #invoice-root .frame-outer {
      border: 2px double var(--r-accent);
      background: var(--r-bg);
      padding: 4px;
    }
    #invoice-root .frame-inner {
      border: 1px solid var(--r-primary);
      background: var(--r-card);
    }
    #invoice-root .pad { padding: 12px 16px 10px; }
    #invoice-root .blessing {
      font-family: var(--r-serif);
      font-size: 12px;
      color: var(--r-primary);
      letter-spacing: 0.6px;
      margin: 0 0 2px;
    }
    #invoice-root .biz-name {
      font-family: var(--r-serif);
      font-size: 20px;
      font-weight: bold;
      color: var(--r-primary);
      line-height: 1.15;
      margin: 0 0 2px;
    }
    #invoice-root .tagline {
      font-size: 10px;
      color: var(--r-secondary);
      font-style: italic;
      margin: 0 0 4px;
      font-family: var(--r-serif);
    }
    #invoice-root .biz-meta {
      font-size: 10px;
      color: var(--r-muted);
      line-height: 1.4;
    }
    #invoice-root .logo-frame {
      display: inline-block;
      background: var(--r-bg);
      border: 1.5px solid var(--r-accent);
      padding: 4px 10px;
      ${radius(forNativePdf, r8)}
      margin-bottom: 6px;
    }
    #invoice-root .logo-frame img {
      height: 52px !important;
      max-height: 52px !important;
      max-width: 180px !important;
      width: auto !important;
      display: block;
    }
    #invoice-root .phone-strip {
      margin: 6px auto 0;
      display: inline-block;
      background: var(--r-bg);
      border: 1.5px solid var(--r-accent);
      border-left: 4px solid var(--r-secondary);
      padding: 4px 16px;
      ${radius(forNativePdf, r6)}
    }
    #invoice-root .phone-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--r-muted);
      margin: 0 0 1px;
    }
    #invoice-root .phone-number {
      font-family: var(--r-serif);
      font-size: 18px;
      font-weight: bold;
      color: var(--r-primary);
      margin: 0;
    }
    #invoice-root .title-ribbon {
      ${titleBg}
      color: #FFF8E8;
      font-family: var(--r-serif);
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      padding: 7px 24px;
      border: 1px solid var(--r-accent);
      ${radius(forNativePdf, '3px')}
    }
    #invoice-root .meta-strip {
      ${metaBg}
      border: 1px solid #E8D5A8;
      padding: 8px 10px;
      margin: 0 0 10px;
      ${radius(forNativePdf, r8)}
    }
    #invoice-root .meta-label {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--r-muted);
      font-weight: 700;
      margin: 0 0 2px;
    }
    #invoice-root .meta-value {
      font-size: 12px;
      font-weight: 700;
      color: var(--r-primary);
      font-family: var(--r-serif);
      margin: 0;
    }
    #invoice-root .section-card {
      border: 1px solid #E8D5A8;
      background: var(--r-bg);
      overflow: hidden;
      margin-bottom: 10px;
      ${radius(forNativePdf, r10)}
    }
    #invoice-root .section-head {
      ${sectionHeadBg}
      color: #FFF8E8;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 10px;
      font-family: var(--r-serif);
    }
    #invoice-root .section-body {
      padding: 8px 10px;
      background: var(--r-card);
    }
    #invoice-root .kv-label {
      font-size: 9px;
      color: var(--r-muted);
      font-weight: 600;
      width: 38%;
      padding: 4px 0;
      vertical-align: top;
    }
    #invoice-root .kv-value {
      font-size: 11px;
      color: var(--r-text);
      font-weight: 700;
      padding: 4px 0;
    }
    #invoice-root .kv-row td { border-top: 1px dotted #E8D9C0; }
    #invoice-root .kv-row:first-child td { border-top: none; }
    #invoice-root .status-pill {
      display: inline-block;
      font-size: 9px;
      font-weight: bold;
      padding: 2px 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      ${radius(forNativePdf, r14)}
    }
    #invoice-root .murti-photo-wrap {
      display: inline-block;
      background: var(--r-bg);
      border: 1.5px solid var(--r-accent);
      padding: 4px;
      ${radius(forNativePdf, r8)}
    }
    #invoice-root .murti-name {
      font-family: var(--r-serif);
      font-size: 14px;
      font-weight: bold;
      color: var(--r-primary);
      margin: 0 0 4px;
    }
    #invoice-root .murti-sub {
      font-size: 10px;
      color: var(--r-muted);
      margin: 0 0 2px;
    }
    #invoice-root .pay-table {
      width: 100%;
      border-collapse: collapse;
    }
    #invoice-root .pay-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #F0E6DA;
      font-size: 11px;
    }
    #invoice-root .pay-label { color: var(--r-muted); font-weight: 600; }
    #invoice-root .pay-val { font-weight: 700; text-align: right; }
    #invoice-root .pay-total td {
      ${totalRowBg}
      font-family: var(--r-serif);
      font-size: 12px;
      color: var(--r-primary);
      font-weight: bold;
      border-bottom: 1px solid #E8D5A8;
    }
    #invoice-root .pay-balance td {
      background: #FFF0E0;
      border-bottom: none;
      padding: 8px;
    }
    #invoice-root .pay-balance .pay-label {
      color: var(--r-primary);
      font-weight: bold;
      font-size: 12px;
    }
    #invoice-root .pay-balance .pay-val {
      color: var(--r-secondary);
      font-size: 16px;
      font-weight: bold;
      font-family: var(--r-serif);
    }
    #invoice-root .notes-box {
      background: var(--r-bg);
      border: 1px solid #E8D5A8;
      border-left: 3px solid var(--r-secondary);
      padding: 7px 10px;
      font-size: 10px;
      color: var(--r-muted);
      line-height: 1.4;
      margin-bottom: 10px;
      ${radius(forNativePdf, r8)}
    }
    #invoice-root .qr-card {
      background: var(--r-bg);
      border: 1.5px solid var(--r-accent);
      padding: 6px 8px;
      text-align: center;
      display: inline-block;
      ${radius(forNativePdf, r10)}
    }
    #invoice-root .qr-label {
      font-size: 8px;
      color: var(--r-primary);
      font-weight: 700;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-family: var(--r-serif);
    }
    #invoice-root .footer-block {
      margin-top: 8px;
      border-top: 1.5px solid var(--r-accent);
      padding-top: 8px;
      text-align: center;
    }
    #invoice-root .footer-mantra {
      font-family: var(--r-serif);
      font-size: 13px;
      font-weight: bold;
      color: var(--r-primary);
      margin: 0 0 3px;
    }
    #invoice-root .footer-thanks {
      font-size: 11px;
      color: var(--r-secondary);
      font-weight: 700;
      margin: 0 0 4px;
      font-family: var(--r-serif);
    }
    #invoice-root .footer-terms {
      font-size: 8px;
      color: var(--r-muted);
      line-height: 1.4;
      max-width: 560px;
      margin: 0 auto 4px;
    }
    #invoice-root .footer-care {
      font-size: 13px;
      font-weight: bold;
      color: var(--r-primary);
      font-family: var(--r-serif);
      margin: 0 0 2px;
    }
    #invoice-root .footer-meta {
      font-size: 8px;
      color: var(--r-muted);
    }
    #invoice-root .gold-rule {
      height: 1px;
      ${goldRuleBg}
      border: none;
      margin: 2px 0 6px;
    }
  </style>`;
}

function kvRow(label: string, value: string): string {
  return `<tr class="kv-row">
    <td class="kv-label">${label}</td>
    <td class="kv-value">${value}</td>
  </tr>`;
}

export function buildReceiptHtmlBody(
  booking: Booking,
  settings: BusinessDocumentSettings,
  qrMarkup: string,
  logoMarkup: string,
  forNativePdf = false,
  murtiPhotoMarkup = ''
): string {
  const tagline = escapeHtml(BRAND_TAGLINE);
  const businessName = escapeHtml(
    settings.businessName?.trim() || 'Ganpati Booking'
  );
  const phone = escapeHtml(settings.phone || DEFAULT_PHONES);
  const address = escapeHtml(settings.address || DEFAULT_ADDRESS);
  const receiptNo = escapeHtml(booking.booking_number);
  const invoiceNo = escapeHtml(`INV-${booking.booking_number}`);
  const bookingDate = escapeHtml(formatDisplayDate(booking.booking_date));
  const deliveryDate = booking.delivery_date
    ? escapeHtml(formatDisplayDate(booking.delivery_date))
    : '';
  const customerName = escapeHtml(booking.customer_name);
  const mobile = escapeHtml(booking.mobile);
  const customerAddress = booking.address
    ? escapeHtml(booking.address)
    : '';
  const murtiName = escapeHtml(booking.murti_name);
  const murtiSize = booking.murti_size
    ? escapeHtml(booking.murti_size)
    : '—';
  const total = escapeHtml(formatCurrency(booking.price));
  const advance = escapeHtml(formatCurrency(booking.advance));
  const pending = escapeHtml(formatCurrency(booking.pending));
  const status = escapeHtml(booking.status);
  const paymentMode = booking.payment_mode
    ? escapeHtml(booking.payment_mode)
    : '—';
  const notes = booking.notes ? escapeHtml(booking.notes) : '';

  const statusBg = booking.status === 'Delivered' ? '#E8F5E9' : '#FFF3E0';
  const statusColor = booking.status === 'Delivered' ? '#2E7D32' : '#E65100';
  const statusPill = `<span class="status-pill" style="background-color:${statusBg};color:${statusColor};">${status}</span>`;

  const logoBlock = logoMarkup
    ? `<div class="logo-frame">${logoMarkup}</div>`
    : '';

  const murtiPhotoBlock = murtiPhotoMarkup
    ? `<div class="murti-photo-wrap">${murtiPhotoMarkup}</div>`
    : `<div class="murti-photo-wrap" style="width:140px;height:140px;text-align:center;line-height:140px;color:#A1887F;font-size:10px;font-weight:700;">No photo</div>`;

  const notesBlock = notes
    ? `<div class="notes-box"><strong style="color:#7B1E1E;">Notes:</strong> ${notes}</div>`
    : '';

  return `${receiptStyles(forNativePdf)}
<div id="invoice-root">
  <div class="frame-outer">
    <div class="frame-inner">
      <div class="pad">

        <!-- Header / Logo -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:8px;">
              ${logoBlock}
              <div class="blessing">॥ श्री गणेशाय नमः ॥</div>
              <div class="biz-name">${businessName}</div>
              <div class="tagline">${tagline}</div>
              <div class="biz-meta">${address}</div>
              <div class="phone-strip">
                <div class="phone-label">Contact / Phone</div>
                <div class="phone-number">${phone}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Title -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:0 0 10px;">
              <span class="title-ribbon">Booking Receipt</span>
            </td>
          </tr>
        </table>

        <!-- Booking / Receipt No. strip -->
        <div class="meta-strip">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="25%" valign="top">
                <div class="meta-label">Booking / Receipt No.</div>
                <div class="meta-value">${receiptNo}</div>
              </td>
              <td width="25%" valign="top">
                <div class="meta-label">Invoice No.</div>
                <div class="meta-value">${invoiceNo}</div>
              </td>
              <td width="25%" valign="top">
                <div class="meta-label">Booking Date</div>
                <div class="meta-value">${bookingDate}</div>
              </td>
              <td width="25%" valign="top" align="right">
                <div class="meta-label">Booking Status</div>
                <div style="margin-top:2px;">${statusPill}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Customer Details -->
        <div class="section-card">
          <div class="section-head">Customer Details</div>
          <div class="section-body">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${kvRow('Customer Name', customerName)}
              ${kvRow('Mobile Number', mobile)}
              ${
                customerAddress
                  ? kvRow('Address', customerAddress)
                  : ''
              }
            </table>
          </div>
        </div>

        <!-- Murti Details -->
        <div class="section-card">
          <div class="section-head">Murti Details</div>
          <div class="section-body">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="160" valign="top" style="padding-right:12px;">
                  ${murtiPhotoBlock}
                </td>
                <td valign="top">
                  <div class="murti-name">${murtiName}</div>
                  <div class="murti-sub"><strong>Size:</strong> ${murtiSize}</div>
                  <div class="murti-sub"><strong>Qty:</strong> 1</div>
                  ${
                    deliveryDate
                      ? `<div class="murti-sub"><strong>Delivery / Pickup:</strong> ${deliveryDate}</div>`
                      : ''
                  }
                  <div class="murti-sub" style="margin-top:6px;color:#7B1E1E;font-weight:700;">
                    Booked Murti — ${tagline}
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Payment Details -->
        <div class="section-card">
          <div class="section-head">Payment Details</div>
          <div class="section-body" style="padding:0;">
            <table class="pay-table" cellpadding="0" cellspacing="0">
              <tr>
                <td class="pay-label">Total Amount</td>
                <td class="pay-val">${total}</td>
              </tr>
              <tr>
                <td class="pay-label">Advance Paid</td>
                <td class="pay-val">${advance}</td>
              </tr>
              <tr>
                <td class="pay-label">Payment Mode</td>
                <td class="pay-val">${paymentMode}</td>
              </tr>
              <tr class="pay-total">
                <td class="pay-label">Grand Total</td>
                <td class="pay-val">${total}</td>
              </tr>
              <tr class="pay-balance">
                <td class="pay-label">Balance / Pending</td>
                <td class="pay-val">${pending}</td>
              </tr>
            </table>
          </div>
        </div>

        ${notesBlock}

        <!-- QR + care -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
          <tr>
            <td width="68%" valign="middle" style="padding-right:10px;font-size:10px;color:#6D4C41;line-height:1.4;">
              <strong style="color:#7B1E1E;font-family:Georgia,'Times New Roman',serif;">Customer Care</strong><br/>
              For booking assistance, please call<br/>
              <span style="font-size:17px;font-weight:bold;color:#7B1E1E;font-family:Georgia,'Times New Roman',serif;">${phone}</span><br/>
              <span style="font-size:9px;">${tagline}</span>
              <div style="margin-top:6px;font-size:8px;line-height:1.35;">
                <strong style="color:#7B1E1E;">T&amp;Cs:</strong>
                Advance is non-refundable. Balance due on delivery / pickup.
                Please present this receipt at the time of collection.
              </div>
            </td>
            <td width="32%" align="center" valign="middle">
              <div class="qr-card">
                ${qrMarkup}
                <div class="qr-label">Scan for Booking</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div class="footer-block">
          <hr class="gold-rule" />
          <div class="footer-mantra">🙏 गणपती बाप्पा मोरया 🙏</div>
          <div class="footer-thanks">Thank you for your booking with ${businessName}</div>
          <div class="footer-terms">
            May Lord Ganesha bless your home with wisdom, prosperity, and joy.
            This is a computer-generated genuine booking receipt.
          </div>
          <div class="footer-care">Customer Care: ${phone}</div>
          <div class="footer-meta">${businessName} &bull; ${tagline}</div>
        </div>

      </div>
    </div>
  </div>
</div>`;
}
