import { NextResponse } from "next/server";
import { getCorpus } from "@/lib/corpus";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const corpus = await getCorpus({ force });
  return NextResponse.json({
    count: corpus.opportunities.length,
    updatedAt: corpus.updatedAt,
    runs: corpus.runs,
    opportunities: corpus.opportunities,
  });
}
