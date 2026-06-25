import type { Opportunity, SourceAdapter, SourceRun } from "../types";
import type { Corpus } from "../store";
import { ADAPTERS } from "../sources";
import { dedupeOpportunities } from "../dedupe";

interface AdapterOutcome {
  run: SourceRun;
  opportunities: Opportunity[];
}

async function runAdapter(adapter: SourceAdapter): Promise<AdapterOutcome> {
  const started = Date.now();
  try {
    const opportunities = await adapter.fetch();
    return {
      opportunities,
      run: {
        id: adapter.meta.id,
        label: adapter.meta.label,
        ok: true,
        count: opportunities.length,
        durationMs: Date.now() - started,
        ranAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      opportunities: [],
      run: {
        id: adapter.meta.id,
        label: adapter.meta.label,
        ok: false,
        count: 0,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
        ranAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Run every adapter concurrently (isolated — one failure never sinks the run),
 * merge + dedupe, and return a fresh corpus snapshot.
 */
export async function aggregate(adapters: SourceAdapter[] = ADAPTERS): Promise<Corpus> {
  const settled = await Promise.allSettled(adapters.map(runAdapter));

  const runs: SourceRun[] = [];
  const all: Opportunity[] = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled") {
      runs.push(s.value.run);
      all.push(...s.value.opportunities);
    } else {
      const a = adapters[i];
      runs.push({
        id: a.meta.id,
        label: a.meta.label,
        ok: false,
        count: 0,
        durationMs: 0,
        error: String(s.reason),
        ranAt: new Date().toISOString(),
      });
    }
  }

  const opportunities = dedupeOpportunities(all);
  return { opportunities, runs, updatedAt: new Date().toISOString() };
}
