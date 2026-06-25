import { SKILL_SLUGS, SKILLS, SYNONYMS } from "./taxonomy";
import { slugify, uniq } from "./utils";

// Build a label→slug lookup once so we can match "Machine Learning" → "machine-learning".
const LABEL_TO_SLUG: Record<string, string> = {};
for (const s of SKILLS) {
  LABEL_TO_SLUG[s.label.toLowerCase()] = s.slug;
  LABEL_TO_SLUG[s.slug] = s.slug;
}

/**
 * Map a single raw term onto a canonical skill slug, or null if it isn't in the
 * controlled vocabulary. Tries: exact slug → synonym map → label match → slugify.
 */
export function canonicalizeTerm(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (!lower) return null;
  if (SYNONYMS[lower]) return SYNONYMS[lower];
  if (LABEL_TO_SLUG[lower]) return LABEL_TO_SLUG[lower];
  const slug = slugify(lower);
  if (SKILL_SLUGS.has(slug)) return slug;
  if (SYNONYMS[slug]) return SYNONYMS[slug];
  return null;
}

/**
 * Given an array of raw theme/skill strings (e.g. Devpost `themes`, Unstop
 * `required_skills`), return de-duplicated canonical slugs.
 */
export function canonicalizeTerms(raw: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    if (!r) continue;
    const c = canonicalizeTerm(r);
    if (c) out.push(c);
  }
  return uniq(out);
}

// Phrases we scan free-text for, longest first so "machine learning" wins over "learning".
const TEXT_PHRASES: { phrase: string; slug: string }[] = (() => {
  const entries: { phrase: string; slug: string }[] = [];
  for (const s of SKILLS) {
    entries.push({ phrase: s.label.toLowerCase(), slug: s.slug });
    entries.push({ phrase: s.slug.replace(/-/g, " "), slug: s.slug });
  }
  for (const [k, v] of Object.entries(SYNONYMS)) {
    if (k.length >= 3) entries.push({ phrase: k, slug: v });
  }
  // de-dupe by phrase, keep longest phrases first
  const seen = new Set<string>();
  return entries
    .filter((e) => (seen.has(e.phrase) ? false : (seen.add(e.phrase), true)))
    .sort((a, b) => b.phrase.length - a.phrase.length);
})();

/**
 * Pull canonical skill tags out of a free-text blob (title + description).
 * Word-boundary matched to avoid "go" matching "going". Returns up to `limit`.
 */
export function extractTagsFromText(text: string, limit = 8): string[] {
  if (!text) return [];
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9+#./ ]+/g, " ")} `;
  const found: string[] = [];
  for (const { phrase, slug } of TEXT_PHRASES) {
    if (found.includes(slug)) continue;
    // word-boundary-ish: surround with spaces
    if (hay.includes(` ${phrase} `) || hay.includes(` ${phrase}.`) || hay.includes(` ${phrase},`)) {
      found.push(slug);
      if (found.length >= limit) break;
    }
  }
  return found;
}

/** Combine explicit tag arrays with text-mined tags, capped and de-duped. */
export function buildTags(opts: {
  explicit?: (string | null | undefined)[];
  text?: string;
  limit?: number;
}): string[] {
  const explicit = canonicalizeTerms(opts.explicit ?? []);
  const mined = opts.text ? extractTagsFromText(opts.text, 10) : [];
  return uniq([...explicit, ...mined]).slice(0, opts.limit ?? 10);
}
