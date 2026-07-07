import { BusinessSettings } from '@/types/settings';
import { Enquiry } from '@/types/enquiry';

export const ENQUIRY_MESSAGE_PLACEHOLDERS =
  '{customer}, {businessName}, {address}, {phone}, {mapLink}, {stallDetails}';

export const DEFAULT_ENQUIRY_MESSAGE = `🙏 Namaste {customer} 🙏

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

export function buildEnquiryWhatsAppMessage(
  settings: BusinessSettings,
  enquiry: Enquiry
): string {
  const template = settings.enquiryMessage?.trim() || DEFAULT_ENQUIRY_MESSAGE;
  const name = enquiry.customer_name?.trim() || 'Sir/Madam';
  const stallDetails =
    settings.stallDescription?.trim() ||
    'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.';
  const mapLink = settings.mapLink?.trim() || '';
  const callSection = enquiry.call_date
    ? `\n📞 Your call on: ${formatCallDate(enquiry.call_date)}`
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
