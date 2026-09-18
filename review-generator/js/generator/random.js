/** FNV-1a hash for seed strings. */
export function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG — deterministic from numeric seed. */
export function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rng, arr) {
  if (!arr.length) return '';
  return arr[Math.floor(rng() * arr.length)];
}

export function maybeFrom(rng, arr, probability) {
  if (!arr.length || rng() > probability) return null;
  return pickFrom(rng, arr);
}

/** Mix visitor ID, time, attempt, and crypto bytes for unique generation per visitor. */
export function buildGenerationSeed(visitorId, attempt = 0) {
  const timePart = Date.now().toString(36);
  const randomPart =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint32Array(2)))
          .map((n) => n.toString(36))
          .join('')
      : Math.random().toString(36).slice(2);
  return hashString(`${visitorId}|${timePart}|${attempt}|${randomPart}`);
}
