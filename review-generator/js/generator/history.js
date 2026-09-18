function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSet(text) {
  return new Set(normalize(text).split(' ').filter(Boolean));
}

/** Jaccard similarity — catches near-duplicate drafts. */
export function similarity(a, b) {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

export function fingerprint(text) {
  return normalize(text);
}

export function isTooSimilarToHistory(draft, history, threshold = 0.68) {
  const fp = fingerprint(draft);
  return history.some((item) => {
    if (item === fp) return true;
    return similarity(item, fp) >= threshold;
  });
}

export function rememberInHistory(draft, history) {
  const fp = fingerprint(draft);
  if (history.includes(fp)) return history;
  return [...history, fp];
}
