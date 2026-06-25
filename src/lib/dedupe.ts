import type { Opportunity } from "./types";
import { slugify } from "./utils";

// Live sources outrank curated seed/fallback when the same item appears twice.
const SOURCE_PRIORITY: Record<string, number> = {
  devpost: 10,
  devfolio: 10,
  unstop: 9,
  mlh: 9,
  codeforces: 8,
  codechef: 8,
  kaggle: 8,
  greenhouse: 7,
  arbeitnow: 6,
  adzuna: 6,
  scholarships: 5,
  seed: 1,
};

function priority(source: string): number {
  return SOURCE_PRIORITY[source] ?? 4;
}

/** Cross-source near-duplicate key: category + normalised title + org. */
function dupKey(o: Opportunity): string {
  const t = slugify(o.title).split("-").slice(0, 6).join("-");
  const org = slugify(o.organization ?? "");
  return `${o.category}:${t}:${org}`;
}

/**
 * Two-pass dedupe: exact id (source + canonical URL), then cross-source by a
 * title+org key, keeping the higher-priority (live over seed) record.
 */
export function dedupeOpportunities(opps: Opportunity[]): Opportunity[] {
  const byId = new Map<string, Opportunity>();
  for (const o of opps) {
    const existing = byId.get(o.id);
    if (!existing || priority(o.source) > priority(existing.source)) byId.set(o.id, o);
  }

  const byKey = new Map<string, Opportunity>();
  for (const o of byId.values()) {
    const key = dupKey(o);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, o);
      continue;
    }
    // Keep the higher-priority source; tie-break on the one with a deadline.
    const pa = priority(o.source);
    const pe = priority(existing.source);
    if (pa > pe || (pa === pe && o.deadline && !existing.deadline)) {
      byKey.set(key, o);
    }
  }

  return Array.from(byKey.values());
}
