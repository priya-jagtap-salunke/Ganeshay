import { GLOBAL_DEDUP } from '../config.js';

/**
 * Optional server-side dedup across different devices.
 * POST { fingerprint, visitorId } → { duplicate: boolean }
 */
export async function checkGlobalDuplicate(fingerprint, visitorId) {
  if (!GLOBAL_DEDUP.enabled || !GLOBAL_DEDUP.endpoint) {
    return false;
  }

  try {
    const response = await fetch(GLOBAL_DEDUP.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, visitorId }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return Boolean(data.duplicate);
  } catch {
    return false;
  }
}
