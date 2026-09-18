import { AI_API, BUSINESS_NAME, PRODUCT_NAME } from './config.js';
import { KEYWORD_POOL } from './generator/pools.js';

/**
 * Connect your AI API via YOUR backend — never expose API keys here.
 *
 * Backend example (Node / Supabase Edge Function):
 *   - Read OPENAI_API_KEY from environment
 *   - Accept POST { visitorId, history, attempt, instructions }
 *   - Return { draft: "..." } in natural English only
 */
export async function requestAiDraft({
  visitorId,
  history = [],
  attempt = 0,
}) {
  if (!AI_API.enabled || !AI_API.endpoint) {
    return null;
  }

  const response = await fetch(AI_API.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      attempt,
      businessName: BUSINESS_NAME,
      productName: PRODUCT_NAME,
      history,
      language: 'english',
      keywordPool: KEYWORD_POOL,
      instructions: [
        'Generate ONE Google review DRAFT in natural English only.',
        'Length: approximately 30–80 words.',
        'Sound like a real customer — not SEO content.',
        'Use 2–4 keywords from the pool naturally; never keyword-stuff.',
        'Do not invent exaggerated claims or guarantee 5 stars.',
        'Do not use Marathi, Hindi, or Hinglish.',
        'Must be different from all drafts in history.',
        'Use varied opening, structure, tone, and closing.',
        'This is a draft only — customer will edit before posting.',
      ],
      provider: AI_API.provider,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI endpoint returned ${response.status}`);
  }

  const data = await response.json();
  const draft = typeof data.draft === 'string' ? data.draft.trim() : '';
  return draft || null;
}
