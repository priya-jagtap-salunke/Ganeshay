import { SuggestedPrompt } from './types';

/**
 * Master switch for user-facing AI Hub UI (FAB, Settings toggle, assistant route).
 * AI Hub temporarily disabled — re-enable by setting this to `true` and
 * uncommenting the gated call sites (see app/(app)/_layout.tsx, SettingsForm).
 */
export const AI_HUB_ENABLED = false;

/** Marketing shortcuts → template ids (local generators, no LLM). */
export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'wa-promo',
    label: 'WhatsApp promo',
    prompt: 'whatsapp_promo',
    category: 'marketing',
  },
  {
    id: 'marathi-msg',
    label: 'Marathi message',
    prompt: 'marathi_invite',
    category: 'marketing',
  },
  {
    id: 'instagram',
    label: 'Instagram caption',
    prompt: 'instagram_caption',
    category: 'marketing',
  },
  {
    id: 'festival',
    label: 'Festival greeting',
    prompt: 'festival_greeting',
    category: 'marketing',
  },
  {
    id: 'poster',
    label: 'Promo poster',
    prompt: 'promo_poster',
    category: 'marketing',
  },
  {
    id: 'personalized',
    label: 'Thank-you',
    prompt: 'personalized_thanks',
    category: 'marketing',
  },
  {
    id: 'reminder',
    label: 'Reminder',
    prompt: 'personalized_reminder',
    category: 'marketing',
  },

  // Sales Analyst — UI focus hints (cards + rule-based narrative)
  {
    id: 'sales-overview',
    label: 'Full overview',
    prompt: 'overview',
    category: 'sales',
  },
  {
    id: 'top-idol',
    label: 'Top idol',
    prompt: 'top_idol',
    category: 'sales',
  },
  {
    id: 'revenue-trend',
    label: 'Revenue trend',
    prompt: 'trend',
    category: 'sales',
  },
  {
    id: 'repeat-customers',
    label: 'Repeat customers',
    prompt: 'repeat',
    category: 'sales',
  },
  {
    id: 'slow-stock',
    label: 'Slow movers',
    prompt: 'slow',
    category: 'sales',
  },

  // Help tips
  {
    id: 'help-marketing',
    label: 'Marketing tips',
    prompt: 'marketing',
    category: 'help',
  },
  {
    id: 'help-sales',
    label: 'Sales tips',
    prompt: 'sales',
    category: 'help',
  },
  {
    id: 'help-free',
    label: 'Free mode',
    prompt: 'free',
    category: 'help',
  },
];

/** @deprecated LLM poster markers — free hub uses PosterBrief objects directly. */
export const POSTER_MARKER_RE = /<!--POSTER:([\s\S]*?)-->/;

export function promptsForCategory(
  category: SuggestedPrompt['category']
): SuggestedPrompt[] {
  return SUGGESTED_PROMPTS.filter((p) => p.category === category);
}
