/**
 * ============================================================
 * REVIEW GENERATOR CONFIG — edit these values only
 * ============================================================
 */

/**
 * ⭐ PASTE YOUR GOOGLE REVIEW URL HERE
 * Google Business Profile → Ask for reviews → copy link.
 */
export const GOOGLE_REVIEW_URL =
  'https://maps.app.goo.gl/xbENsAo5Eq9R4c739?g_st=ic';

export const BUSINESS_NAME = 'Bappaji.com';

export const PRODUCT_NAME = 'Eco-friendly Shadu Mati Ganpati Murti';

/**
 * ⭐ AI API CONFIGURATION (optional — keys stay on your server)
 *
 * 1. Build a backend endpoint (Supabase Edge Function, Vercel, etc.)
 * 2. Store OPENAI_API_KEY / ANTHROPIC_API_KEY as server secrets
 * 3. Set enabled: true and paste your endpoint URL below
 */
export const AI_API = {
  enabled: false,
  /** Your backend URL — NOT the OpenAI/Claude URL directly. */
  endpoint: '/api/generate-review',
  /** e.g. 'openai' | 'anthropic' — used by your backend, documented here. */
  provider: 'openai',
};

/**
 * Optional global dedup across different devices (recommended at scale).
 * Without this, uniqueness relies on a large local combinatorial engine.
 */
export const GLOBAL_DEDUP = {
  enabled: false,
  /** POST { fingerprint, visitorId } → { duplicate: boolean } */
  endpoint: '/api/review-draft/register',
};
