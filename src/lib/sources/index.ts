import type { SourceAdapter } from "../types";
import { devpostAdapter } from "./devpost";
import { devfolioAdapter } from "./devfolio";
import { unstopAdapter } from "./unstop";
import { mlhAdapter } from "./mlh";
import { codeforcesAdapter } from "./codeforces";
import { codechefAdapter } from "./codechef";
import { greenhouseAdapter } from "./greenhouse";
import { arbeitnowAdapter } from "./arbeitnow";
import { adzunaAdapter } from "./adzuna";
import { kaggleAdapter } from "./kaggle";
import { scholarshipsAdapter } from "./scholarships";
import { seedAdapter } from "./seed";

const adzunaConfigured = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
const kaggleConfigured = !!(process.env.KAGGLE_USERNAME && process.env.KAGGLE_KEY);

/**
 * The live-source registry. The aggregator runs them all concurrently and
 * isolates failures. Key-gated sources (Adzuna, Kaggle) only join the registry
 * once their env vars are set in .env.local — add the keys, restart, done.
 * Curated sources (scholarships, seed) always succeed and keep the feed full.
 */
export const ADAPTERS: SourceAdapter[] = [
  devpostAdapter,
  devfolioAdapter,
  unstopAdapter,
  mlhAdapter,
  codeforcesAdapter,
  codechefAdapter,
  greenhouseAdapter,
  arbeitnowAdapter,
  ...(adzunaConfigured ? [adzunaAdapter] : []),
  ...(kaggleConfigured ? [kaggleAdapter] : []),
  scholarshipsAdapter,
  seedAdapter,
];

export const SOURCE_META = ADAPTERS.map((a) => a.meta);
