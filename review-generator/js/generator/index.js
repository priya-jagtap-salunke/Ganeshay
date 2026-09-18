import { AI_API } from '../config.js';
import { requestAiDraft } from '../aiAdapter.js';
import { composeUniqueLocalDraft } from './composer.js';
import { fingerprint, isTooSimilarToHistory, rememberInHistory } from './history.js';
import { checkGlobalDuplicate } from './globalDedup.js';
import {
  getOrCreateVisitorId,
  loadSessionHistory,
  saveSessionHistory,
  markInitialDraftAssigned,
} from './visitor.js';

const MAX_ATTEMPTS = 20;

/**
 * generateUniqueReview()
 * ----------------------
 * 1. Identifies the anonymous visitor/session
 * 2. Generates a unique English review draft
 * 3. Checks against session history (+ optional global dedup)
 * 4. Returns the draft to the UI
 *
 * ONE shared link → each new visitor gets a different draft.
 */
export async function generateUniqueReview(options = {}) {
  const visitorId = options.visitorId ?? getOrCreateVisitorId();
  let sessionHistory = options.history ?? loadSessionHistory();

  if (AI_API.enabled && AI_API.endpoint) {
    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const aiDraft = await requestAiDraft({
          visitorId,
          history: sessionHistory,
          attempt,
        });

        if (!aiDraft || isTooSimilarToHistory(aiDraft, sessionHistory)) {
          continue;
        }

        const fp = fingerprint(aiDraft);
        const globalDup = await checkGlobalDuplicate(fp, visitorId);
        if (globalDup) continue;

        sessionHistory = rememberInHistory(aiDraft, sessionHistory);
        saveSessionHistory(sessionHistory);
        markInitialDraftAssigned();

        return {
          draft: aiDraft,
          visitorId,
          source: 'ai',
          history: sessionHistory,
        };
      }
    } catch (err) {
      console.warn('AI generation unavailable, using local engine:', err);
    }
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { draft, profileId, source } = composeUniqueLocalDraft(
      visitorId,
      sessionHistory,
      attempt
    );

    if (isTooSimilarToHistory(draft, sessionHistory)) {
      continue;
    }

    const fp = fingerprint(draft);
    const globalDup = await checkGlobalDuplicate(fp, visitorId);
    if (globalDup) continue;

    sessionHistory = rememberInHistory(draft, sessionHistory);
    saveSessionHistory(sessionHistory);
    markInitialDraftAssigned();

    return {
      draft,
      visitorId,
      source,
      profileId,
      history: sessionHistory,
    };
  }

  const fallback = composeUniqueLocalDraft(
    `${visitorId}-${Date.now()}`,
    sessionHistory,
    0
  );
  sessionHistory = rememberInHistory(fallback.draft, sessionHistory);
  saveSessionHistory(sessionHistory);
  markInitialDraftAssigned();

  return {
    draft: fallback.draft,
    visitorId,
    source: 'local',
    profileId: fallback.profileId,
    history: sessionHistory,
  };
}

/** Backward-compatible alias used by app.js */
export const generateReviewDraft = generateUniqueReview;
