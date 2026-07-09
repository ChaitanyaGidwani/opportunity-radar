import type { Nudge, NudgeChannel, NudgeWindow, Opportunity } from "./types";
import { formatDate } from "./format";

const HOUR = 3_600_000;
const DAY = 86_400_000;

interface WindowDef {
  window: NudgeWindow;
  offsetMs: number;
  /** Only schedule this window for these categories (undefined = all). */
  categories?: Opportunity["category"][];
}

// Deadline-RELATIVE schedule (not a fixed weekly cadence). T-14d is reserved for
// high-effort applications (scholarships, competitions, hackathons).
export const NUDGE_WINDOWS: WindowDef[] = [
  { window: "T-14d", offsetMs: 14 * DAY, categories: ["scholarship", "competition", "hackathon"] },
  { window: "T-7d", offsetMs: 7 * DAY },
  { window: "T-3d", offsetMs: 3 * DAY },
  { window: "T-1d", offsetMs: 1 * DAY },
  { window: "T-3h", offsetMs: 3 * HOUR },
];

const WINDOW_LABEL: Record<NudgeWindow, string> = {
  "T-14d": "2 weeks out",
  "T-7d": "1 week out",
  "T-3d": "3 days out",
  "T-1d": "1 day out",
  "T-3h": "Last call",
};

export function windowLabel(w: NudgeWindow): string {
  return WINDOW_LABEL[w];
}

/** Loss-aversion + personalised + social-proof copy per window. */
function copyFor(o: Opportunity, w: NudgeWindow): string {
  const title = o.title;
  const by = o.deadline ? formatDate(o.deadline) : "soon";
  const social =
    o.popularity && o.popularity > 200
      ? ` ${o.popularity.toLocaleString("en-IN")} students are already in.`
      : "";

  if (o.category === "event") {
    switch (w) {
      case "T-14d":
        return `Two weeks out — "${title}" happens ${by}. Save your spot if you haven't RSVP'd.${social}`;
      case "T-7d":
        return `One week out for "${title}".${social} Spots tend to fill up — RSVP soon.`;
      case "T-3d":
        return `Only 3 days away — "${title}" happens ${by}. Lock in your RSVP.`;
      case "T-1d":
        return `Happening tomorrow: "${title}".`;
      case "T-3h":
        return `Starting soon — "${title}" kicks off in ~3 hours.`;
    }
  }

  switch (w) {
    case "T-14d":
      return `Two weeks to go — "${title}" closes ${by}. Block 20 minutes this week to start your application.${social}`;
    case "T-7d":
      return `One week left for "${title}".${social} Get ahead before the rush.`;
    case "T-3d":
      return `Only 3 days left — "${title}" closes ${by}. Don't let this one slip.`;
    case "T-1d":
      return `Closes tomorrow: "${title}". Last day to apply is ${by}.`;
    case "T-3h":
      return `Last call — "${title}" closes in ~3 hours. Don't lose your shot.`;
  }
}

/**
 * Build the nudge timeline for a single opportunity. Windows whose fire time is
 * more than 14 days in the past are dropped (no clutter); recently-due ones are
 * kept so the notification center has substance, and future ones are scheduled.
 */
export function nudgesForOpportunity(
  o: Opportunity,
  now: number,
  channel: NudgeChannel = "in-app",
): Nudge[] {
  if (!o.deadline) return [];
  const deadline = new Date(o.deadline).getTime();
  if (isNaN(deadline) || deadline < now - DAY) return [];

  const out: Nudge[] = [];
  for (const def of NUDGE_WINDOWS) {
    if (def.categories && !def.categories.includes(o.category)) continue;
    const fireAt = deadline - def.offsetMs;
    if (fireAt > deadline) continue;
    // Keep windows due within the last 14 days, or any future window before the deadline.
    if (fireAt < now - 14 * DAY) continue;
    if (fireAt > deadline) continue;

    out.push({
      id: `${o.id}|${def.window}`,
      opportunityId: o.id,
      title: o.title,
      window: def.window,
      fireAt: new Date(fireAt).toISOString(),
      message: copyFor(o, def.window),
      channel,
      deadline: o.deadline,
      sourceUrl: o.sourceUrl,
      category: o.category,
      due: fireAt <= now,
    });
  }
  return out;
}

/** Flatten + sort a set of opportunities into one nudge timeline (newest fire first). */
export function buildNudgeTimeline(
  opps: Opportunity[],
  now: number,
  channel: NudgeChannel = "in-app",
): Nudge[] {
  const all = opps.flatMap((o) => nudgesForOpportunity(o, now, channel));
  // Due nudges first (most recently fired at top), then upcoming by soonest.
  return all.sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1;
    const af = new Date(a.fireAt).getTime();
    const bf = new Date(b.fireAt).getTime();
    return a.due ? bf - af : af - bf;
  });
}

/** Which opportunities qualify for nudges: high relevance AND a real deadline. */
export function isNudgeWorthy(score: number, o: Opportunity, topN = false): boolean {
  return !!o.deadline && (topN || score > 0.5);
}
