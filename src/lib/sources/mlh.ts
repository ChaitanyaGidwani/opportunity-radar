import type { Opportunity, SourceAdapter } from "../types";
import { buildTags } from "../normalize";
import { toISO } from "../parse";
import { BROWSER_UA, buildOpportunity, fetchText } from "./_shared";

// MLH (Major League Hacking) season events. No API, but the season page embeds a
// JSON payload with an `upcomingEvents` array — we extract that directly (far more
// robust than DOM scraping). Keyless. Deep-links to each event's own website.
const SEASON_URL = "https://mlh.com/seasons/2026/events";

interface MlhEvent {
  name?: string;
  startsAt?: string;
  endsAt?: string;
  dateRange?: string;
  url?: string;
  websiteUrl?: string;
  location?: string;
  formatType?: string; // "digital" | "physical" | "hybrid"
  logoUrl?: string;
  backgroundUrl?: string;
}

/** Extract a JSON array value by key from a larger blob via bracket matching. */
function extractJsonArray(html: string, key: string): unknown[] | null {
  const marker = `"${key}":`;
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const start = html.indexOf("[", i);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let k = start; k < html.length; k++) {
    const ch = html[k];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, k + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function normalize(e: MlhEvent): Opportunity | null {
  if (!e.name) return null;
  const digital = e.formatType === "digital" || /everywhere|worldwide|online|digital/i.test(e.location ?? "");
  const sourceUrl = e.websiteUrl || (e.url ? `https://mlh.com${e.url}` : SEASON_URL);
  return buildOpportunity("mlh", "MLH", {
    category: "hackathon",
    title: e.name.trim(),
    organization: "Major League Hacking",
    sourceUrl,
    imageUrl: e.backgroundUrl,
    logoUrl: e.logoUrl,
    location: digital ? "Online" : e.location,
    isRemote: digital || undefined,
    startDate: toISO(e.startsAt),
    deadline: toISO(e.startsAt), // you register before it begins
    summary: [e.location, e.dateRange].filter(Boolean).join(" · ") || undefined,
    tags: buildTags({ text: e.name, limit: 6 }),
  });
}

export const mlhAdapter: SourceAdapter = {
  meta: {
    id: "mlh",
    label: "MLH",
    category: "hackathon",
    homepage: "https://mlh.com",
    tier: "amber",
  },
  async fetch(): Promise<Opportunity[]> {
    const html = await fetchText(SEASON_URL, { ua: BROWSER_UA, timeoutMs: 12_000 });
    const events = (extractJsonArray(html, "upcomingEvents") ?? []) as MlhEvent[];
    const out: Opportunity[] = [];
    for (const e of events) {
      const o = normalize(e);
      if (o) out.push(o);
    }
    return out;
  },
};
