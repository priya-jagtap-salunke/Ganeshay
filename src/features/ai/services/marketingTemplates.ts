import { BusinessSettings } from '@/types/settings';
import {
  MarketingCustomerPick,
  MarketingDraft,
  MarketingTemplateId,
  PosterBrief,
} from '../types';

export type StallProfile = Pick<
  BusinessSettings,
  'businessName' | 'phone' | 'address' | 'mapLink' | 'stallDescription'
>;

function biz(profile: StallProfile): string {
  return profile.businessName?.trim() || 'Ganeshay Stall';
}

function contactLine(profile: StallProfile): string {
  const parts: string[] = [];
  if (profile.phone?.trim()) parts.push(profile.phone.trim());
  if (profile.address?.trim()) parts.push(profile.address.trim());
  return parts.join(' · ');
}

function mapHint(profile: StallProfile): string {
  return profile.mapLink?.trim()
    ? `\n📍 Location: ${profile.mapLink.trim()}`
    : '';
}

function descHint(profile: StallProfile): string {
  return profile.stallDescription?.trim()
    ? `\n${profile.stallDescription.trim()}`
    : '';
}

function firstName(full: string): string {
  const part = full.trim().split(/\s+/)[0];
  return part || 'Customer';
}

const TEMPLATE_META: Record<
  MarketingTemplateId,
  { title: string; language: 'en' | 'mr' }
> = {
  whatsapp_promo: { title: 'WhatsApp promo', language: 'en' },
  marathi_invite: { title: 'Marathi invite', language: 'mr' },
  instagram_caption: { title: 'Instagram caption', language: 'en' },
  festival_greeting: { title: 'Festival greeting', language: 'en' },
  promo_poster: { title: 'Promo poster', language: 'en' },
  personalized_thanks: { title: 'Personalized thank-you', language: 'en' },
  personalized_reminder: { title: 'Personalized reminder', language: 'en' },
};

export function marketingTemplateMeta(id: MarketingTemplateId) {
  return TEMPLATE_META[id];
}

export const MARKETING_TEMPLATE_OPTIONS: Array<{
  id: MarketingTemplateId;
  label: string;
  subtitle: string;
  needsCustomer: boolean;
}> = [
  {
    id: 'whatsapp_promo',
    label: 'WhatsApp promo',
    subtitle: 'Short English booking invite for broadcasts',
    needsCustomer: false,
  },
  {
    id: 'marathi_invite',
    label: 'Marathi message',
    subtitle: 'Warm Devanagari WhatsApp invite',
    needsCustomer: false,
  },
  {
    id: 'instagram_caption',
    label: 'Instagram caption',
    subtitle: 'Caption + hashtags for your stall',
    needsCustomer: false,
  },
  {
    id: 'festival_greeting',
    label: 'Festival greeting',
    subtitle: 'Ganesh Chaturthi EN + Marathi line',
    needsCustomer: false,
  },
  {
    id: 'promo_poster',
    label: 'Promo poster',
    subtitle: 'HTML→PDF poster from your stall details',
    needsCustomer: false,
  },
  {
    id: 'personalized_thanks',
    label: 'Thank-you (customer)',
    subtitle: 'Personal note from a recent booking',
    needsCustomer: true,
  },
  {
    id: 'personalized_reminder',
    label: 'Reminder (customer)',
    subtitle: 'Pending / pickup reminder draft',
    needsCustomer: true,
  },
];

function buildPosterBrief(profile: StallProfile): PosterBrief {
  return {
    headline: `Book your Shree Ganesha murti at ${biz(profile)}`,
    subheadline: 'Eco-friendly · Handcrafted · Trusted stall',
    body:
      profile.stallDescription?.trim() ||
      'Beautiful Shadu Mati murtis in popular sizes. Advance booking open — visit or message us today.',
    cta: profile.phone?.trim()
      ? `Call / WhatsApp ${profile.phone.trim()}`
      : 'Book your murti today',
    festival: 'Ganesh Chaturthi',
    language: 'en',
    style: 'festive',
  };
}

/**
 * Local template engine — no LLM. Personalizes from vendor settings + optional booking row.
 */
export function generateMarketingDraft(
  templateId: MarketingTemplateId,
  profile: StallProfile,
  customer?: MarketingCustomerPick | null
): MarketingDraft {
  const meta = TEMPLATE_META[templateId];
  const name = biz(profile);
  const contact = contactLine(profile);
  const map = mapHint(profile);
  const desc = descHint(profile);

  switch (templateId) {
    case 'whatsapp_promo': {
      const text = `🙏 Namaste!

Book your eco-friendly Shree Ganesha murti at *${name}*.

✨ Popular sizes available
✨ Quality Shadu Mati craftsmanship
✨ Easy advance booking

${contact ? `📞 ${contact}` : 'Message us to book.'}${map}${desc}

Reply here to reserve your murti. We never auto-book — this is just an invite.`;
      return { templateId, title: meta.title, language: 'en', text, poster: null };
    }

    case 'marathi_invite': {
      const text = `🙏 नमस्कार!

*${name}* येथे पर्यावरणपूरक श्री गणेश मूर्तींचे बुकिंग सुरू आहे.

✨ विविध आकार उपलब्ध
✨ शाडू माती · उत्तम कलाकुसर
✨ अ‍ॅडव्हान्स बुकिंग सोयीस्कर

${contact ? `📞 ${contact}` : 'बुकिंगसाठी मेसेज करा.'}${map}

आपली मूर्ती आत्ताच रिझर्व्ह करा. हा फक्त मसुदा आहे — आपोआप मेसेज पाठवला जात नाही.`;
      return { templateId, title: meta.title, language: 'mr', text, poster: null };
    }

    case 'instagram_caption': {
      const text = `Bring home blessings this season 🙏

Handcrafted Shree Ganesha murtis at ${name}.
Eco-friendly · Beautiful finishes · Easy booking.

${contact ? `${contact}\n` : ''}${map ? map.trim() + '\n' : ''}
Book your murti today — link / DM / call.

#GaneshChaturthi #GanpatiBappaMorya #GaneshaMurti #EcoFriendlyGanpati #ShaduMati #MurtiBooking #Ganeshay #FestivalSeason #Bappa`;
      return { templateId, title: meta.title, language: 'en', text, poster: null };
    }

    case 'festival_greeting': {
      const text = `🙏 गणपति बाप्पा मोरया!

Wishing you and your family a joyful Ganesh Chaturthi from *${name}*.

May Lord Ganesha bring wisdom, prosperity, and happiness to your home.

शुभ गणेश चतुर्थी! 🌺

${contact ? `— ${name}${profile.phone?.trim() ? ` · ${profile.phone.trim()}` : ''}` : `— ${name}`}`;
      return { templateId, title: meta.title, language: 'en', text, poster: null };
    }

    case 'promo_poster': {
      const poster = buildPosterBrief(profile);
      const text = `${poster.headline}

${poster.subheadline ?? ''}

${poster.body ?? ''}

${poster.cta ?? ''}

${contact ? contact : ''}

(Export Poster PDF below — attach manually when sharing.)`;
      return {
        templateId,
        title: meta.title,
        language: 'en',
        text: text.trim(),
        poster,
      };
    }

    case 'personalized_thanks': {
      if (!customer) {
        return {
          templateId,
          title: meta.title,
          language: 'en',
          text: 'Select a recent customer below to personalize this thank-you draft.',
          poster: null,
        };
      }
      const murti = [customer.murti_name, customer.murti_size]
        .filter(Boolean)
        .join(' · ');
      const text = `Dear ${firstName(customer.customer_name)},

Thank you for booking with *${name}*.

Your booking: ${murti || 'Shree Ganesha murti'}
Date: ${customer.booking_date}

We look forward to serving you. For any update, reply on WhatsApp${
        profile.phone?.trim() ? ` (${profile.phone.trim()})` : ''
      }.

🙏 गणपति बाप्पा मोरया!
— ${name}`;
      return {
        templateId,
        title: meta.title,
        language: 'en',
        text,
        poster: null,
        customerMobile: customer.mobile,
      };
    }

    case 'personalized_reminder': {
      if (!customer) {
        return {
          templateId,
          title: meta.title,
          language: 'en',
          text: 'Select a recent customer below to personalize this reminder draft.',
          poster: null,
        };
      }
      const murti = [customer.murti_name, customer.murti_size]
        .filter(Boolean)
        .join(' · ');
      const pending =
        customer.pending > 0
          ? `\nPending balance: ₹${Math.round(customer.pending).toLocaleString('en-IN')}`
          : '\nYour balance looks clear — this is a friendly pickup / delivery reminder.';
      const text = `Dear ${firstName(customer.customer_name)},

Gentle reminder from *${name}* about your murti booking (${murti || 'Shree Ganesha'}).
Booking date: ${customer.booking_date}${pending}

Please message us to confirm timing${
        profile.phone?.trim() ? ` on ${profile.phone.trim()}` : ''
      }.

🙏 — ${name}

(This is a draft only — nothing was sent automatically.)`;
      return {
        templateId,
        title: meta.title,
        language: 'en',
        text,
        poster: null,
        customerMobile: customer.mobile,
      };
    }

    default: {
      const _exhaustive: never = templateId;
      return {
        templateId: _exhaustive,
        title: 'Draft',
        language: 'en',
        text: '',
        poster: null,
      };
    }
  }
}
