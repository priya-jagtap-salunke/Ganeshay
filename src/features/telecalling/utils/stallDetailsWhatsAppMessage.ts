import { BusinessSettings } from '@/types/settings';

export const STALL_DETAILS_MESSAGE_PLACEHOLDERS =
  '{customer}, {businessName}, {address}, {phone}, {mapLink}, {instagramLink}, {websiteLink}, {stallDetails}';

/** @deprecated Use STALL_DETAILS_MESSAGE_PLACEHOLDERS */
export const ENQUIRY_MESSAGE_PLACEHOLDERS = STALL_DETAILS_MESSAGE_PLACEHOLDERS;

const DEFAULT_MAP_LINK =
  'https://maps.app.goo.gl/xbENsAo5Eq9R4c739?g_st=ic';
const DEFAULT_INSTAGRAM_LINK = 'https://www.instagram.com/bappaji_com';
const DEFAULT_WEBSITE_LINK = 'https://bappaji.com/';

export const DEFAULT_STALL_DETAILS_MESSAGE = `🌺 ॥ गणपती बाप्पा मोरया ॥ 🌺
🙏🏻 नमस्कार छत्रपती संभाजीनगरकर 🙏🏻

✨ दरवर्षीप्रमाणे ह्याही वर्षी…
Bappaji.com घेऊन आले आहे पेण, रायगड येथील सुप्रसिद्ध शाडू मातीतील सुंदर, सुबक आणि आकर्षक श्री गणेशमूर्ती! 🙏🌿 ज्या बघताक्षणी कुणालाही प्रेमात पाडतील ❤️❤️

🌱 पर्यावरणपूरक मूर्ती | सुंदर डिझाईन्स | शेकडो पर्याय

🙏 आपल्या घरी घेऊन जा एक सुंदर, पवित्र व पर्यावरणपूरक बाप्पा ❤️

🔥 त्वरित पूर्वनोंदणी करा!
📅 २० ऑगस्ट २०२६ पासून सुरू

🎉 तर मग येताय ना नक्की!!!
एकदा अवश्य भेट द्या… बाप्पा तुमची आतुरतेने वाट पाहत आहेत! 💫

📍 खिंवसरा मेफेअर शॉपिंग कॉम्प्लेक्स,
उल्कानगरी, छत्रपती संभाजीनगर

🗺️ Google Maps:
{mapLink}

📸 Instagram:
{instagramLink}

🌐 Website:
{websiteLink}

📞 संपर्क: 7972962917 / 9665543009

🌺 गणपती बाप्पा मोरया! 🌺`;

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

function ensureWebsiteLinkSection(message: string, websiteLink: string): string {
  const link = websiteLink.trim() || DEFAULT_WEBSITE_LINK;
  const lower = message.toLowerCase();
  if (
    lower.includes(link.toLowerCase()) ||
    lower.includes('🌐 website') ||
    /website:\s*\n?\s*https?:\/\/bappaji\.com/i.test(message)
  ) {
    return message;
  }
  // Same layout as Instagram block when older saved templates omit Website.
  return `${message}\n\n🌐 Website:\n${link}`;
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
  const mapLink = settings.mapLink?.trim() || DEFAULT_MAP_LINK;
  const instagramLink =
    settings.instagramLink?.trim() || DEFAULT_INSTAGRAM_LINK;
  const websiteLink = settings.websiteLink?.trim() || DEFAULT_WEBSITE_LINK;
  const callSection = recipient.callDate
    ? `\n📞 Your call on: ${formatCallDate(recipient.callDate)}`
    : '';

  const message = applyPlaceholders(template, {
    customer: name,
    businessName: settings.businessName,
    address: settings.address,
    phone: settings.phone,
    mapLink,
    instagramLink,
    websiteLink,
    stallDetails,
  });

  const withCall = callSection ? `${message}${callSection}` : message;
  return ensureWebsiteLinkSection(withCall, websiteLink);
}
