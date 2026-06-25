import { getCorpus } from "@/lib/corpus";
import { buildICS } from "@/lib/ics";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const corpus = await getCorpus();
  const o = corpus.opportunities.find((x) => x.id === decodeURIComponent(id));
  if (!o) return new Response("Opportunity not found", { status: 404 });

  const ics = buildICS(o);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(o.title).slice(0, 40) || "deadline"}.ics"`,
    },
  });
}
