import { BusinessSettings } from '@/types/settings';

export const STALL_DETAILS_MESSAGE_PLACEHOLDERS =
  '{customer}, {businessName}, {address}, {phone}, {mapLink}, {stallDetails}';

/** @deprecated Use STALL_DETAILS_MESSAGE_PLACEHOLDERS */
export const ENQUIRY_MESSAGE_PLACEHOLDERS = STALL_DETAILS_MESSAGE_PLACEHOLDERS;

export const DEFAULT_STALL_DETAILS_MESSAGE = `🙏 Namaste {customer} 🙏

Thank you for enquiring about our Shree Ganesha Murti stall!

🏪 *{businessName}*
🪔 Eco-friendly Shree Ganesha Murti

📍 *Location:*
{address}
📌 Location Pin: {mapLink}

📋 *Stall Details:*
{stallDetails}

☎️ *Contact:*
{phone}

Visit us or reply here for sizes, prices, and booking.

Ganpati Bappa Morya! 🙏`;

/** @deprecated Use DEFAULT_STALL_DETAILS_MESSAGE */
export const DEFAULT_ENQUIRY_MESSAGE = DEFAULT_STALL_DETAILS_MESSAGE;

function formatCallDate(callDate: string | null): string {
  if (!callDate) return '';
  const date = new Date(callDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function applyPlaceholders(
  template: string,
  values: Record<string, string>
): string {
  let message = template;
  for (const [key, value] of Object.entries(values)) {
    message = message.replaceAll(`{${key}}`, value);
  }
  return message
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export interface StallDetailsRecipient {
  customerName?: string | null;
  /** Optional call timestamp shown as a footer line. */
  callDate?: string | null;
}

/** Stall details template from settings, personalized for a recipient name. */
export function buildStallDetailsWhatsAppMessage(
  settings: BusinessSettings,
  recipient: StallDetailsRecipient = {}
): string {
  const template =
    settings.enquiryMessage?.trim() || DEFAULT_STALL_DETAILS_MESSAGE;
  const name = recipient.customerName?.trim() || 'Sir/Madam';
  const stallDetails =
    settings.stallDescription?.trim() ||
    'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.';
  const mapLink = settings.mapLink?.trim() || '';
  const callSection = recipient.callDate
    ? `\n📞 Your call on: ${formatCallDate(recipient.callDate)}`
    : '';

  const message = applyPlaceholders(template, {
    customer: name,
    businessName: settings.businessName,
    address: settings.address,
    phone: settings.phone,
    mapLink,
    stallDetails,
  });

  return callSection ? `${message}${callSection}` : message;
}
