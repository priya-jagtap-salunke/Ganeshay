import { Booking } from '@/types/booking';
import { BusinessDocumentSettings } from '@/types/settings';
import { formatCurrency } from '@/utils/currency';
import { formatDisplayDate } from '@/utils/dates';
import {
  DEFAULT_ADDRESS,
  DEFAULT_PHONES,
} from '../assets/receiptAssets';

const BRAND_TAGLINE = 'Eco-friendly Shree Ganesha Murti';

/** Subtle Ganesha silhouette for header watermark (PDF-safe inline SVG). */
const GANESHA_WATERMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="72" height="72" aria-hidden="true">
  <g fill="none" stroke="#D4AF37" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.22">
    <ellipse cx="60" cy="58" rx="28" ry="32"/>
    <path d="M60 26c8 0 14 6 14 14v6H46v-6c0-8 6-14 14-14z"/>
    <path d="M46 46c-10 4-16 14-14 24 2 8 10 14 20 14h16c10 0 18-6 20-14 2-10-4-20-14-24"/>
    <path d="M74 52c8-2 18 2 22 12 3 8-1 16-8 18"/>
    <path d="M52 62h16M56 72h8"/>
    <path d="M42 38c-6-10-4-18 2-22M78 38c6-10 4-18-2-22"/>
    <circle cx="52" cy="48" r="2.2" fill="#D4AF37" stroke="none" opacity="0.35"/>
    <circle cx="68" cy="48" r="2.2" fill="#D4AF37" stroke="none" opacity="0.35"/>
  </g>
</svg>`;

/** Corner lotus motif — light line art. */
const CORNER_LOTUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
  <g fill="none" stroke="#D4AF37" stroke-width="1.2" stroke-linecap="round" opacity="0.55">
    <path d="M24 40c0-10 6-16 12-20-2 10-6 16-12 20z"/>
    <path d="M24 40c0-10-6-16-12-20 2 10 6 16 12 20z"/>
    <path d="M24 40c4-12 4-22 0-30-4 8-4 18 0 30z"/>
    <path d="M12 22c6 2 10 6 12 12"/>
    <path d="M36 22c-6 2-10 6-12 12"/>
  </g>
</svg>`;

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
  const r8 = forNativePdf ? '0' : '8px';
  const r10 = forNativePdf ? '0' : '10px';
  const r14 = forNativePdf ? '0' : '14px';
  const titleBg = forNativePdf
    ? 'background-color:#7B1E1E;'
    : 'background:linear-gradient(180deg,#8B2424 0%,#7B1E1E 55%,#5E1515 100%);';
  const sectionHeadBg = forNativePdf
    ? 'background-color:#7B1E1E;'
    : 'background:linear-gradient(90deg,#7B1E1E 0%,#9A2E2E 100%);';
  const productHeadBg = forNativePdf
    ? 'background-color:#7B1E1E;'
    : 'background:linear-gradient(180deg,#8B2424 0%,#7B1E1E 100%);';
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
      --r-border: #D4AF37;
      --r-row-alt: #FBF3E4;
      --r-balance: #FFF0E0;
      --r-serif: Georgia, "Times New Roman", Times, serif;
      --r-sans: Arial, Helvetica, sans-serif;
      width: 680px;
      margin: 0 auto;
      color: var(--r-text);
      font-family: var(--r-sans);
      font-size: 11px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    #invoice-root * { box-sizing: border-box; }
    #invoice-root .frame-outer {
      border: 2px double var(--r-accent);
      background: var(--r-bg);
      padding: 3px;
      page-break-inside: avoid;
    }
    #invoice-root .frame-inner {
      border: 1px solid var(--r-primary);
      background: var(--r-card);
      position: relative;
      overflow: hidden;
    }
    #invoice-root .pad {
      padding: 10px 14px 8px;
      position: relative;
      z-index: 1;
    }
    #invoice-root .divider-ornament {
      text-align: center;
      color: var(--r-accent);
      font-size: 9px;
      letter-spacing: 2px;
      padding: 2px 0 4px;
      font-family: var(--r-serif);
      line-height: 1;
    }
    #invoice-root .blessing {
      font-family: var(--r-serif);
      font-size: 12px;
      color: var(--r-primary);
      letter-spacing: 0.8px;
      margin: 0 0 2px;
    }
    #invoice-root .biz-name {
      font-family: var(--r-serif);
      font-size: 18px;
      font-weight: bold;
      color: var(--r-primary);
      line-height: 1.15;
      margin: 0 0 1px;
    }
    #invoice-root .tagline {
      font-size: 10px;
      color: var(--r-secondary);
      font-style: italic;
      margin: 0 0 3px;
      font-family: var(--r-serif);
    }
    #invoice-root .biz-meta {
      font-size: 10px;
      color: var(--r-muted);
      line-height: 1.35;
    }
    #invoice-root .phone-strip {
      margin: 4px auto 0;
      display: inline-block;
      background: var(--r-bg);
      border: 1.5px solid var(--r-accent);
      border-left: 4px solid var(--r-secondary);
      padding: 4px 16px;
      ${radius(forNativePdf, '6px')}
    }
    #invoice-root .phone-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--r-muted);
      font-family: var(--r-serif);
      margin: 0 0 1px;
    }
    #invoice-root .phone-number {
      font-family: var(--r-serif);
      font-size: 22px;
      font-weight: bold;
      color: var(--r-primary);
      letter-spacing: 0.5px;
      line-height: 1.15;
      margin: 0;
    }
    #invoice-root .logo-frame {
      display: inline-block;
      background: var(--r-bg);
      border: 1.5px solid var(--r-accent);
      padding: 4px 10px;
      ${radius(forNativePdf, '8px')}
      margin-bottom: 4px;
    }
    #invoice-root .logo-frame img {
      height: 52px !important;
      max-height: 52px !important;
      max-width: 180px !important;
      width: auto !important;
      display: block;
    }
    #invoice-root .watermark {
      position: absolute;
      top: 10px;
      right: 14px;
      z-index: 0;
      pointer-events: none;
      line-height: 0;
    }
    #invoice-root .corner {
      position: absolute;
      z-index: 0;
      line-height: 0;
      pointer-events: none;
    }
    #invoice-root .corner-tl { top: 4px; left: 4px; }
    #invoice-root .corner-tr { top: 4px; right: 4px; transform: scaleX(-1); }
    #invoice-root .corner-bl { bottom: 4px; left: 4px; transform: scaleY(-1); }
    #invoice-root .corner-br { bottom: 4px; right: 4px; transform: scale(-1); }
    #invoice-root .title-ribbon {
      ${titleBg}
      color: #FFF8E8;
      font-family: var(--r-serif);
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      padding: 5px 22px;
      border: 1px solid var(--r-accent);
      ${radius(forNativePdf, '3px')}
    }
    #invoice-root .section-card {
      border: 1px solid #E8D5A8;
      background: var(--r-bg);
      overflow: hidden;
      ${radius(forNativePdf, r10)}
    }
    #invoice-root .section-head {
      ${sectionHeadBg}
      color: #FFF8E8;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 8px;
      font-family: var(--r-serif);
    }
    #invoice-root .section-body { padding: 4px 8px; background: var(--r-card); }
    #invoice-root .kv-label {
      font-size: 9px;
      color: var(--r-muted);
      font-weight: 600;
      width: 36%;
      padding: 2px 0;
      vertical-align: top;
    }
    #invoice-root .kv-value {
      font-size: 11px;
      color: var(--r-text);
      font-weight: 700;
      padding: 2px 0;
    }
    #invoice-root .kv-row td { border-top: 1px dotted #E8D9C0; }
    #invoice-root .kv-row:first-child td { border-top: none; }
    #invoice-root .icon {
      display: inline-block;
      width: 11px;
      text-align: center;
      margin-right: 2px;
      color: var(--r-accent);
      font-size: 9px;
    }
    #invoice-root .status-pill {
      display: inline-block;
      font-size: 9px;
      font-weight: bold;
      padding: 1px 7px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      ${radius(forNativePdf, r14)}
    }
    #invoice-root .products {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--r-accent);
      margin: 0 0 8px;
    }
    #invoice-root .products th {
      ${productHeadBg}
      color: #FFF8E8;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 5px 7px;
      border-right: 1px solid rgba(212,175,55,0.35);
      font-family: var(--r-serif);
    }
    #invoice-root .products th:last-child { border-right: none; }
    #invoice-root .products td {
      padding: 5px 7px;
      border-top: 1px solid #EFE2C8;
      font-size: 11px;
      vertical-align: middle;
    }
    #invoice-root .products tr.row-a td { background: #FFFFFF; }
    #invoice-root .products tr.row-b td { background: var(--r-row-alt); }
    #invoice-root .prod-name {
      font-size: 12px;
      font-weight: bold;
      color: var(--r-primary);
      font-family: var(--r-serif);
    }
    #invoice-root .prod-sub {
      font-size: 9px;
      color: var(--r-muted);
      margin-top: 1px;
    }
    #invoice-root .pay-card {
      border: 1.5px solid var(--r-accent);
      background: var(--r-card);
      overflow: hidden;
      ${radius(forNativePdf, r8)}
    }
    #invoice-root .pay-head {
      background: var(--r-bg);
      text-align: center;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--r-primary);
      border-bottom: 1px solid #E8D5A8;
      font-family: var(--r-serif);
    }
    #invoice-root .pay-row td {
      padding: 4px 8px;
      font-size: 11px;
      border-bottom: 1px solid #F0E6DA;
    }
    #invoice-root .pay-label { color: var(--r-muted); font-weight: 600; }
    #invoice-root .pay-val { font-weight: 700; text-align: right; }
    #invoice-root .pay-total td {
      ${totalRowBg}
      border-bottom: 1px solid #E8D5A8;
      font-family: var(--r-serif);
      font-size: 12px;
      color: var(--r-primary);
      font-weight: bold;
    }
    #invoice-root .pay-balance td {
      background: var(--r-balance);
      border-bottom: none;
      padding: 5px 8px;
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
      padding: 5px 8px;
      font-size: 10px;
      color: var(--r-muted);
      line-height: 1.35;
      ${radius(forNativePdf, r8)}
    }
    #invoice-root .qr-card {
      background: var(--r-bg);
      border: 1.5px solid var(--r-accent);
      padding: 4px 6px;
      text-align: center;
      ${radius(forNativePdf, r10)}
      display: inline-block;
    }
    #invoice-root .qr-label {
      font-size: 8px;
      color: var(--r-primary);
      font-weight: 700;
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-family: var(--r-serif);
    }
    #invoice-root .footer-block {
      margin-top: 6px;
      border-top: 1.5px solid var(--r-accent);
      padding-top: 6px;
      text-align: center;
    }
    #invoice-root .footer-mantra {
      font-family: var(--r-serif);
      font-size: 12px;
      font-weight: bold;
      color: var(--r-primary);
      margin: 0 0 2px;
    }
    #invoice-root .footer-thanks {
      font-size: 10px;
      color: var(--r-secondary);
      font-weight: 700;
      margin: 0 0 3px;
      font-family: var(--r-serif);
    }
    #invoice-root .footer-terms {
      font-size: 8px;
      color: var(--r-muted);
      line-height: 1.35;
      max-width: 580px;
      margin: 0 auto 3px;
    }
    #invoice-root .footer-care {
      font-size: 14px;
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
      margin: 2px 0;
    }
  </style>`;
}

export function buildReceiptHtmlBody(
  booking: Booking,
  settings: BusinessDocumentSettings,
  qrMarkup: string,
  logoMarkup: string,
  forNativePdf = false
): string {
  const tagline = escapeHtml(BRAND_TAGLINE);
  const businessName = escapeHtml(
    settings.businessName?.trim() || 'Ganpati Booking'
  );
  const phone = escapeHtml(settings.phone || DEFAULT_PHONES);
  const address = escapeHtml(settings.address || DEFAULT_ADDRESS);
  const invoiceNo = escapeHtml(`INV-${booking.booking_number}`);
  const bookingId = escapeHtml(booking.booking_number);
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
    : '';
  const notes = booking.notes ? escapeHtml(booking.notes) : '';

  const statusBg = booking.status === 'Delivered' ? '#E8F5E9' : '#FFF3E0';
  const statusColor = booking.status === 'Delivered' ? '#2E7D32' : '#E65100';

  const paymentRow = paymentMode
    ? `<tr class="kv-row">
        <td class="kv-label"><span class="icon">◆</span>Payment</td>
        <td class="kv-value">${paymentMode}</td>
      </tr>`
    : '';

  const addressRow = customerAddress
    ? `<tr class="kv-row">
        <td class="kv-label"><span class="icon">◆</span>Address</td>
        <td class="kv-value" style="font-size:10px;font-weight:600;">${customerAddress}</td>
      </tr>`
    : '';

  const deliveryRow = deliveryDate
    ? `<tr class="kv-row">
        <td class="kv-label"><span class="icon">◆</span>Delivery</td>
        <td class="kv-value">${deliveryDate}</td>
      </tr>`
    : '';

  const notesBlock = notes
    ? `<strong style="color:#7B1E1E;">Notes:</strong> ${notes}`
    : 'Thank you for your booking. Please keep this invoice for delivery and payment reference.';

  const logoBlock = logoMarkup
    ? `<div class="logo-frame">${logoMarkup}</div>`
    : '';

  return `${receiptStyles(forNativePdf)}
<div id="invoice-root">

  <div class="frame-outer">
    <div class="frame-inner">
      <div class="corner corner-tl">${CORNER_LOTUS_SVG}</div>
      <div class="corner corner-tr">${CORNER_LOTUS_SVG}</div>
      <div class="corner corner-bl">${CORNER_LOTUS_SVG}</div>
      <div class="corner corner-br">${CORNER_LOTUS_SVG}</div>
      <div class="watermark">${GANESHA_WATERMARK_SVG}</div>

      <div class="pad">

        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:4px;">
              ${logoBlock}
              <div class="blessing">॥ श्री गणेशाय नमः ॥</div>
              <div class="biz-name">${businessName}</div>
              <div class="tagline">${tagline}</div>
              <div class="biz-meta">${address}</div>
              <div class="phone-strip">
                <div class="phone-label">Contact / Phone</div>
                <div class="phone-number">${phone}</div>
              </div>
              <div class="divider-ornament">✦ &nbsp;❧&nbsp; ✦</div>
            </td>
          </tr>
        </table>

        <!-- Title ribbon -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:0 0 8px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" class="title-ribbon">Ganpati Booking Receipt</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Customer + booking cards -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td width="50%" valign="top" style="padding-right:5px;">
              <div class="section-card">
                <div class="section-head">Customer Details</div>
                <div class="section-body">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr class="kv-row">
                      <td class="kv-label"><span class="icon">◆</span>Name</td>
                      <td class="kv-value">${customerName}</td>
                    </tr>
                    <tr class="kv-row">
                      <td class="kv-label"><span class="icon">◆</span>Mobile</td>
                      <td class="kv-value">${mobile}</td>
                    </tr>
                    ${addressRow}
                  </table>
                </div>
              </div>
            </td>
            <td width="50%" valign="top" style="padding-left:5px;">
              <div class="section-card">
                <div class="section-head">Booking Details</div>
                <div class="section-body">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr class="kv-row">
                      <td class="kv-label"><span class="icon">◆</span>Booking ID</td>
                      <td class="kv-value">${bookingId}</td>
                    </tr>
                    <tr class="kv-row">
                      <td class="kv-label"><span class="icon">◆</span>Invoice No.</td>
                      <td class="kv-value">${invoiceNo}</td>
                    </tr>
                    <tr class="kv-row">
                      <td class="kv-label"><span class="icon">◆</span>Date</td>
                      <td class="kv-value">${bookingDate}</td>
                    </tr>
                    ${deliveryRow}
                    <tr class="kv-row">
                      <td class="kv-label"><span class="icon">◆</span>Status</td>
                      <td class="kv-value">
                        <span class="status-pill" style="background-color:${statusBg};color:${statusColor};">${status}</span>
                      </td>
                    </tr>
                    ${paymentRow}
                  </table>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Product table -->
        <table class="products" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <th align="left">Product</th>
            <th align="center" style="width:64px;">Size</th>
            <th align="center" style="width:40px;">Qty</th>
            <th align="right" style="width:80px;">Rate</th>
            <th align="right" style="width:88px;">Amount</th>
          </tr>
          <tr class="row-a">
            <td>
              <div class="prod-name">${murtiName}</div>
              <div class="prod-sub">Shree Ganapati Murti Booking &bull; ${bookingDate}</div>
            </td>
            <td align="center" style="font-weight:600;color:#3E2723;">${murtiSize}</td>
            <td align="center" style="font-weight:600;">1</td>
            <td align="right" style="font-weight:700;">${total}</td>
            <td align="right" style="font-weight:700;">${total}</td>
          </tr>
        </table>

        <!-- Notes + payment summary -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td width="52%" valign="top" style="padding-right:8px;">
              <div class="notes-box">${notesBlock}</div>
              <div style="margin-top:5px;font-size:8px;color:#6D4C41;line-height:1.3;">
                <strong style="color:#7B1E1E;">T&amp;Cs:</strong>
                Advance non-refundable. Balance on delivery. Present this invoice at collection.
              </div>
            </td>
            <td width="48%" valign="top">
              <div class="pay-card">
                <div class="pay-head">Payment Summary</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr class="pay-row">
                    <td class="pay-label">Subtotal</td>
                    <td class="pay-val">${total}</td>
                  </tr>
                  <tr class="pay-row">
                    <td class="pay-label">Advance Paid</td>
                    <td class="pay-val">${advance}</td>
                  </tr>
                  <tr class="pay-total">
                    <td class="pay-label" style="padding:4px 8px;">Grand Total</td>
                    <td class="pay-val" style="padding:4px 8px;">${total}</td>
                  </tr>
                  <tr class="pay-balance">
                    <td class="pay-label">Balance Due</td>
                    <td class="pay-val">${pending}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>

        <!-- QR + care -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:2px;">
          <tr>
            <td width="68%" valign="middle" style="padding-right:8px;font-size:10px;color:#6D4C41;line-height:1.35;">
              <strong style="color:#7B1E1E;font-family:Georgia,'Times New Roman',serif;">Customer Care</strong><br/>
              For booking assistance, call<br/>
              <span style="font-size:18px;font-weight:bold;color:#7B1E1E;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.3px;">${phone}</span><br/>
              <span style="font-size:9px;">${tagline}</span>
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
            This is a computer-generated booking receipt.
          </div>
          <div class="footer-care">Customer Care: ${phone}</div>
          <div class="footer-meta">${businessName} &bull; ${tagline}</div>
        </div>

      </div>
    </div>
  </div>

</div>`;
}
