const VISITOR_ID_KEY = 'bappaji_visitor_id_v2';
const SESSION_HISTORY_KEY = 'bappaji_session_draft_history_v2';
const INITIAL_DRAFT_KEY = 'bappaji_initial_draft_assigned_v2';

/**
 * Anonymous session identifier — no name, phone, or email.
 * Created once per browser tab/session when the shared link is opened.
 */
export function getOrCreateVisitorId() {
  try {
    let id = sessionStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/** True the first time this visitor opens the shared link in this session. */
export function isFirstDraftForSession() {
  try {
    return !sessionStorage.getItem(INITIAL_DRAFT_KEY);
  } catch {
    return true;
  }
}

export function markInitialDraftAssigned() {
  try {
    sessionStorage.setItem(INITIAL_DRAFT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function loadSessionHistory() {
  try {
    const raw = sessionStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessionHistory(fingerprints) {
  try {
    sessionStorage.setItem(
      SESSION_HISTORY_KEY,
      JSON.stringify(fingerprints.slice(-50))
    );
  } catch {
    /* ignore */
  }
}

/** Stable numeric offset so different visitors start from different pool combinations. */
export function visitorSeedOffset(visitorId) {
  let hash = 2166136261;
  for (let i = 0; i < visitorId.length; i += 1) {
    hash ^= visitorId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}
