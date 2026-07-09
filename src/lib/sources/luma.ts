import type { Opportunity, SourceAdapter } from "../types";
import { buildOpportunity, fetchJson, snippet } from "./_shared";
import { buildTags } from "../normalize";
import { toISO } from "../parse";

// ─────────────────────────────────────────────────────────────────────────────
// Luma (luma.com) — meetups, workshops, mixers and talks. A different shape of
// "opportunity" than the other sources (no application/deadline in the usual
// sense) — these map to the `event` category, not internship/hackathon/etc.
//
// Public, unauthenticated JSON API — verified live 2026-07-09, zero-auth, no
// special headers required. Undocumented (reverse-engineered from the web
// app's own network calls) → tier "amber": we read only metadata, write our
// own summary, and always deep-link out to the origin event page. We never
// republish Luma's content or act as the RSVP endpoint.
//
// GET https://api.luma.com/discover/get-paginated-events
//        ?slug=<place-slug>&pagination_limit=<n>&pagination_cursor=<cursor>
// A place slug (city) self-geo-scopes — no lat/lon needed. Response shape:
// { entries: [{ event, calendar, hosts, guest_count, ... }], has_more, next_cursor }
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT = "https://api.luma.com/discover/get-paginated-events";
const PAGE_LIMIT = 20;
const MAX_PAGES_PER_CITY = 3; // caps a single refresh at ~60 events/city

// India's biggest tech/startup meetup hubs on Luma (place slugs confirmed live).
// Hyderabad/Pune currently return few/no entries — harmless, kept for when
// their local scene grows there; a quiet city just contributes 0 events.
const CITIES: { slug: string; label: string }[] = [
  { slug: "bengaluru", label: "Bengaluru" },
  { slug: "new-delhi", label: "Delhi NCR" },
  { slug: "mumbai", label: "Mumbai" },
  { slug: "hyderabad", label: "Hyderabad" },
  { slug: "pune", label: "Pune" },
];

interface LumaGeoAddressInfo {
  city?: string;
  city_state?: string;
  country?: string;
  country_code?: string;
}

interface LumaCalendar {
  name?: string;
  avatar_url?: string;
}

interface LumaHost {
  name?: string;
}

interface LumaEvent {
  api_id?: string;
  name?: string;
  url?: string; // bare slug — canonical link is https://luma.com/{url}
  start_at?: string;
  timezone?: string;
  location_type?: "offline" | "online";
  cover_url?: string;
  social_image_url?: string;
  geo_address_info?: LumaGeoAddressInfo;
}

interface LumaEntry {
  event?: LumaEvent;
  calendar?: LumaCalendar;
  hosts?: LumaHost[];
  guest_count?: number;
}

interface LumaDiscoverResponse {
  entries?: LumaEntry[];
  has_more?: boolean;
  next_cursor?: string;
}

function normalize(entry: LumaEntry): Opportunity | null {
  const e = entry.event;
  if (!e?.name || !e?.url || !e?.api_id) return null;

  const isOnline = e.location_type === "online";
  const geo = e.geo_address_info;
  const location = geo?.city_state ?? geo?.city ?? (isOnline ? "Online" : undefined);

  // Prefer the hosting community/calendar name; Luma's default "Personal"
  // calendars aren't a useful org label, so fall back to the first host.
  const calendarName = entry.calendar?.name;
  const organization =
    calendarName && calendarName !== "Personal" ? calendarName : entry.hosts?.[0]?.name;

  const summaryParts = [organization, location].filter(Boolean);

  return buildOpportunity("luma", "Luma", {
    category: "event",
    title: e.name.trim(),
    organization,
    sourceUrl: `https://luma.com/${e.url}`,
    summary: snippet(summaryParts.join(" · ")),
    imageUrl: e.social_image_url || e.cover_url,
    logoUrl: entry.calendar?.avatar_url,
    location,
    isRemote: isOnline,
    // No "application deadline" concept for a meetup — the event's start time
    // is the actionable moment, so it drives the same countdown/nudge/eligibility
    // machinery (an event auto-drops from the feed once it has happened).
    deadline: toISO(e.start_at),
    startDate: toISO(e.start_at),
    popularity: entry.guest_count,
    tags: buildTags({ text: `${e.name} ${calendarName ?? ""}`, limit: 6 }),
  });
}

async function fetchCity(city: { slug: string; label: string }): Promise<Opportunity[]> {
  const out: Opportunity[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES_PER_CITY; page++) {
    const params = new URLSearchParams({ slug: city.slug, pagination_limit: String(PAGE_LIMIT) });
    if (cursor) params.set("pagination_cursor", cursor);

    const data = await fetchJson<LumaDiscoverResponse>(`${ENDPOINT}?${params.toString()}`, {
      timeoutMs: 12_000,
    });

    for (const entry of data?.entries ?? []) {
      try {
        const o = normalize(entry);
        if (o) out.push(o);
      } catch {
        // Skip a single malformed entry; keep the rest.
      }
    }

    if (!data?.has_more || !data?.next_cursor) break;
    cursor = data.next_cursor;
  }

  return out;
}

export const lumaAdapter: SourceAdapter = {
  meta: {
    id: "luma",
    label: "Luma",
    category: "event",
    homepage: "https://luma.com",
    tier: "amber",
  },
  async fetch(): Promise<Opportunity[]> {
    const results = await Promise.allSettled(CITIES.map(fetchCity));

    const out: Opportunity[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        for (const o of r.value) {
          if (seen.has(o.id)) continue; // defensive cross-city dedupe
          seen.add(o.id);
          out.push(o);
        }
      } else {
        errors.push(`${CITIES[i].slug}: ${String(r.reason)}`);
      }
    }

    // Only throw if every city failed (the aggregator falls back gracefully).
    if (!out.length && errors.length === CITIES.length) {
      throw new Error(`Luma unreachable — ${errors.join("; ")}`);
    }
    return out;
  },
};
