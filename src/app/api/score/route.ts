import { NextResponse } from "next/server";
import { getCorpus } from "@/lib/corpus";
import { effectiveWeights, scoreOpportunity, type RankContext } from "@/lib/rank";
import type { Profile, ScoredOpportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Score a specific set of opportunity ids for a profile (saved / tracked items).
 * Unlike /api/feed this does NOT drop ineligible or closed items — saved things
 * should always render, even after their deadline passes.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const profile: Profile = body.profile ?? { interests: [], skills: [] };
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

  const corpus = await getCorpus();
  const now = Date.now();
  const maxPop = corpus.opportunities.reduce((m, o) => Math.max(m, o.popularity ?? 0), 0);
  const ctx: RankContext = { now, maxPop, weights: effectiveWeights(profile) };

  const idSet = new Set(ids);
  const items: ScoredOpportunity[] = corpus.opportunities
    .filter((o) => idSet.has(o.id))
    .map((o) => scoreOpportunity(o, profile, ctx));

  return NextResponse.json({ items, updatedAt: corpus.updatedAt });
}
