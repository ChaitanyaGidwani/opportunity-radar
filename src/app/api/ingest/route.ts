import { NextResponse } from "next/server";
import { getCorpus } from "@/lib/corpus";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Force a live re-aggregation. In production this is what the GitHub Actions /
 * cron-job.org trigger calls — gated by INGEST_SECRET when configured. In local
 * dev (no secret set) it is open so the "Rescan sources" button just works.
 */
function authorized(req: Request): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const corpus = await getCorpus({ force: true });
  return NextResponse.json({
    ok: true,
    count: corpus.opportunities.length,
    updatedAt: corpus.updatedAt,
    runs: corpus.runs,
  });
}

export const POST = handle;
export const GET = handle;
