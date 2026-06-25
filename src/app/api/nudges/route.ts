import { NextResponse } from "next/server";
import { getCorpus } from "@/lib/corpus";
import { rank } from "@/lib/rank";
import { buildNudgeTimeline, isNudgeWorthy } from "@/lib/nudges";
import type { NudgeChannel, Opportunity, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Compute the deadline-nudge timeline for a student: their saved/tracked items
 * plus high-relevance matches that are nudge-worthy (score > 0.5 or top-N) and
 * have a real deadline. Returns due (already fired) and upcoming nudges.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const profile: Profile = body.profile ?? { interests: [], skills: [] };
  const savedIds: string[] = Array.isArray(body.savedIds) ? body.savedIds : [];
  const channel: NudgeChannel = body.channel ?? "in-app";

  const corpus = await getCorpus();
  const { items } = rank(corpus.opportunities, profile);

  const picked = new Map<string, Opportunity>();
  // Saved items always get nudges.
  for (const o of corpus.opportunities) {
    if (savedIds.includes(o.id)) picked.set(o.id, o);
  }
  // Top matches + nudge-worthy matches.
  items.slice(0, 8).forEach((i) => picked.set(i.opportunity.id, i.opportunity));
  items
    .filter((i) => isNudgeWorthy(i.score, i.opportunity))
    .slice(0, 24)
    .forEach((i) => picked.set(i.opportunity.id, i.opportunity));

  const opportunities = [...picked.values()];
  const nudges = buildNudgeTimeline(opportunities, Date.now(), channel);

  return NextResponse.json({ nudges, opportunities, updatedAt: corpus.updatedAt });
}
