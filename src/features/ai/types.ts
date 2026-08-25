export type AiMessageRole = 'user' | 'assistant' | 'system';

/**
 * Free AI Hub modes — Marketing + Sales Analyst (+ optional Help).
 * No LLM / OpenAI chat mode.
 */
export type AiHubMode = 'home' | 'marketing' | 'sales' | 'help';

export type MarketingTemplateId =
  | 'whatsapp_promo'
  | 'marathi_invite'
  | 'instagram_caption'
  | 'festival_greeting'
  | 'promo_poster'
  | 'personalized_thanks'
  | 'personalized_reminder';

/** Sales Analyst focus from hub sample chips — scrolls / highlights matching cards. */
export type SalesFocusId =
  | 'overview'
  | 'top_idol'
  | 'payments'
  | 'repeat'
  | 'slow'
  | 'trend';

export interface AiHubNavigatePayload {
  mode: Exclude<AiHubMode, 'home'>;
  marketingTemplate?: MarketingTemplateId;
  salesFocus?: SalesFocusId;
}

export interface AiConversation {
  id: string;
  vendor_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  vendor_id: string;
  role: AiMessageRole;
  content: string;
  created_at: string;
}

export interface PosterBrief {
  headline: string;
  subheadline?: string;
  body?: string;
  cta?: string;
  festival?: string;
  language?: 'en' | 'mr' | 'hi';
  style?: 'festive' | 'promo' | 'greeting';
}

/** Kept for dormant Edge Function streaming types — free hub does not use this. */
export type AiStreamEvent =
  | { type: 'meta'; conversationId: string }
  | { type: 'delta'; content: string }
  | { type: 'poster'; payload: PosterBrief }
  | { type: 'done'; messageId: string; conversationId: string }
  | { type: 'error'; error: string };

export type SuggestedPromptCategory = 'marketing' | 'sales' | 'help';

export interface SuggestedPrompt {
  id: string;
  label: string;
  /** Template id for marketing, or focus key for sales/help */
  prompt: string;
  category: SuggestedPromptCategory;
}

export interface MarketingCustomerPick {
  customer_name: string;
  mobile: string;
  murti_name: string;
  murti_size: string | null;
  booking_date: string;
  pending: number;
}

export interface MarketingDraft {
  templateId: MarketingTemplateId;
  title: string;
  language: 'en' | 'mr';
  text: string;
  poster?: PosterBrief | null;
  customerMobile?: string | null;
}

export interface SalesAnalystInsight {
  lookbackDays: number;
  totalRevenue: number;
  totalBookings: number;
  advanceCollected: number;
  pendingAmount: number;
  avgBookingValue: number;
  topSellingIdol: { name: string; count: number; revenue: number } | null;
  mostProfitable: { name: string; revenue: number; count: number } | null;
  repeatCustomers: {
    count: number;
    totalCustomers: number;
    top: Array<{
      name: string;
      mobileMasked: string;
      bookings: number;
      spent: number;
    }>;
  };
  slowMoving: Array<{ label: string; count: number; lastBooked: string | null }>;
  revenueTrend: Array<{ month: string; revenue: number; bookings: number }>;
  note: string;
}
