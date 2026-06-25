import "server-only";
import { aggregate } from "./aggregator/run";
import { isFresh, peekCorpus, refreshCorpus, type Corpus } from "./store";

/**
 * The single read path for the opportunity corpus. Stale-while-revalidate:
 *  - cold (no snapshot): blocking aggregate (the UI shows a loading state)
 *  - fresh: instant
 *  - stale: serve the snapshot immediately, refresh in the background
 *  - force: blocking re-aggregate (the "Rescan sources" action)
 */
export async function getCorpus({ force = false }: { force?: boolean } = {}): Promise<Corpus> {
  const cached = await peekCorpus();

  if (force) return refreshCorpus(() => aggregate());
  if (cached && isFresh(cached)) return cached;
  if (cached) {
    // Stale: revalidate without blocking the response.
    void refreshCorpus(() => aggregate());
    return cached;
  }
  // Cold start.
  return refreshCorpus(() => aggregate());
}
