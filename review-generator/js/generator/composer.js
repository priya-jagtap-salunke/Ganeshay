import {
  OPENINGS,
  PRODUCT_DESCRIPTIONS,
  EXPERIENCE_STATEMENTS,
  SERVICE_STATEMENTS,
  ECO_STATEMENTS,
  CUSTOMIZATION_STATEMENTS,
  CLOSINGS,
  STYLE_PROFILES,
  STRUCTURE_PATTERNS,
  MR_OPENINGS,
  MR_IDOL_QUALITY,
  MR_ECO,
  MR_SERVICE,
  MR_BOOKING,
  MR_OVERALL,
  MR_CLOSINGS,
  MR_EMOJI,
} from './pools.js';
import {
  createRng,
  buildGenerationSeed,
  pickFrom,
  maybeFrom,
} from './random.js';
import { visitorSeedOffset } from './visitor.js';

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function trimToMaxWords(text, maxWords) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}.`;
}

function resolvePart(type, rng, profile) {
  switch (type) {
    case 'opening':
      return pickFrom(rng, OPENINGS);
    case 'product':
      return pickFrom(rng, PRODUCT_DESCRIPTIONS);
    case 'experience':
      return maybeFrom(rng, EXPERIENCE_STATEMENTS, 0.75);
    case 'service':
      return maybeFrom(rng, SERVICE_STATEMENTS, profile.service ?? 0.65);
    case 'eco':
      return maybeFrom(rng, ECO_STATEMENTS, profile.eco ?? 0.35);
    case 'customization':
      return maybeFrom(rng, CUSTOMIZATION_STATEMENTS, 0.22);
    case 'closing':
      return pickFrom(rng, CLOSINGS);
    default:
      return null;
  }
}

function composeMarathiFromSeed(rng) {
  const parts = [
    pickFrom(rng, MR_OPENINGS),
    maybeFrom(rng, MR_IDOL_QUALITY, 0.88),
    maybeFrom(rng, MR_ECO, 0.38),
    maybeFrom(rng, MR_SERVICE, 0.58),
    maybeFrom(rng, MR_BOOKING, 0.55),
    maybeFrom(rng, MR_OVERALL, 0.45),
    maybeFrom(rng, MR_CLOSINGS, 0.75),
  ].filter(Boolean);

  let draft = parts.join(' ').replace(/\s+/g, ' ').trim();
  const emoji = pickFrom(rng, MR_EMOJI);
  if (emoji) draft = `${draft} ${emoji}`.trim();

  return {
    draft: trimToMaxWords(draft, 55),
    profileId: 'marathi_natural',
    source: 'local',
  };
}

/**
 * Compose one review from pools using a visitor-specific seed.
 * Each visitor + attempt produces a different combination.
 */
export function composeFromSeed(visitorId, attempt = 0) {
  const seed =
    buildGenerationSeed(visitorId, attempt) ^ visitorSeedOffset(visitorId);
  const rng = createRng(seed);

  if (rng() < 0.45) {
    return composeMarathiFromSeed(rng);
  }

  const profile = pickFrom(rng, STYLE_PROFILES);
  const pattern = pickFrom(rng, STRUCTURE_PATTERNS);

  const parts = pattern
    .map((type) => resolvePart(type, rng, profile))
    .filter(Boolean);

  let draft = parts.join(' ').replace(/\s+/g, ' ').trim();

  if (wordCount(draft) < profile.minWords) {
    const extra = maybeFrom(rng, EXPERIENCE_STATEMENTS, 1);
    if (extra) draft = `${draft} ${extra}`;
  }

  if (wordCount(draft) < profile.minWords) {
    const extra = maybeFrom(rng, SERVICE_STATEMENTS, 1);
    if (extra) draft = `${draft} ${extra}`;
  }

  return {
    draft: trimToMaxWords(draft, profile.maxWords),
    profileId: profile.id,
    source: 'local',
  };
}

export function composeUniqueLocalDraft(visitorId, sessionHistory, attempt = 0) {
  for (let i = 0; i < 25; i += 1) {
    const { draft, profileId, source } = composeFromSeed(
      visitorId,
      attempt + i
    );

    const normalized = draft.toLowerCase();
    const duplicate = sessionHistory.some((item) => {
      const wordsA = new Set(item.split(' '));
      const wordsB = new Set(normalized.split(' '));
      let inter = 0;
      for (const w of wordsA) if (wordsB.has(w)) inter += 1;
      const union = wordsA.size + wordsB.size - inter;
      return union && inter / union >= 0.68;
    });

    if (!duplicate) {
      return { draft, profileId, source };
    }
  }

  return composeFromSeed(`${visitorId}-fallback-${Date.now()}`, attempt);
}
