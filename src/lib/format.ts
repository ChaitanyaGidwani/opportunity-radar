import type { Opportunity } from "./types";

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

export interface DeadlineInfo {
  ms: number; // ms until deadline (negative if passed)
  days: number;
  hours: number;
  label: string; // "4 days left", "Closes in 3 hrs", "Closed"
  /** Urgency bucket drives the countdown colour. */
  urgency: "imminent" | "soon" | "approaching" | "normal" | "passed" | "none";
}

export function deadlineInfo(deadline: string | undefined, now = Date.now()): DeadlineInfo {
  if (!deadline) {
    return { ms: Infinity, days: Infinity, hours: Infinity, label: "Rolling", urgency: "none" };
  }
  const t = new Date(deadline).getTime();
  if (isNaN(t)) return { ms: Infinity, days: Infinity, hours: Infinity, label: "Rolling", urgency: "none" };
  const ms = t - now;
  const days = Math.floor(ms / MS_DAY);
  const hours = Math.floor(ms / MS_HOUR);

  if (ms <= 0) return { ms, days, hours, label: "Closed", urgency: "passed" };

  let label: string;
  if (ms < MS_HOUR) label = `${Math.max(1, Math.floor(ms / 60000))} min left`;
  else if (ms < MS_DAY) label = `${hours} hr${hours === 1 ? "" : "s"} left`;
  else if (days < 31) label = `${days} day${days === 1 ? "" : "s"} left`;
  else if (days < 365) label = `${Math.round(days / 30)} mo left`;
  else label = `${Math.round(days / 365)} yr left`;

  let urgency: DeadlineInfo["urgency"];
  if (ms < 24 * MS_HOUR) urgency = "imminent";
  else if (days <= 3) urgency = "soon";
  else if (days <= 7) urgency = "approaching";
  else urgency = "normal";

  return { ms, days, hours, label, urgency };
}

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const USD = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatCurrency(amount: number, currency = "INR"): string {
  if (amount === 0) return currency === "INR" ? "Unpaid" : "—";
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";
  // Indian compact: lakh / crore
  if (currency === "INR") {
    if (amount >= 1e7) return `${sym}${(amount / 1e7).toFixed(amount % 1e7 === 0 ? 0 : 1)} Cr`;
    if (amount >= 1e5) return `${sym}${(amount / 1e5).toFixed(amount % 1e5 === 0 ? 0 : 1)} L`;
    return `${sym}${INR.format(amount)}`;
  }
  if (amount >= 1000) return `${sym}${USD.format(amount)}`;
  return `${sym}${USD.format(amount)}`;
}

/** Human "value" string per category for the card's hero metric. */
export function valueLabel(o: Opportunity): { value: string; note: string } | null {
  if (o.category === "internship" && (o.stipendMin != null || o.stipendMax != null)) {
    const cur = o.currency ?? "INR";
    const per = o.stipendPeriod ?? "month";
    const perShort = per === "month" ? "/mo" : per === "year" ? "/yr" : per === "week" ? "/wk" : "";
    if (o.stipendMin === 0 && (o.stipendMax === 0 || o.stipendMax == null)) {
      return { value: "Unpaid", note: "" };
    }
    if (o.stipendMin != null && o.stipendMax != null && o.stipendMin !== o.stipendMax) {
      return { value: `${formatCurrency(o.stipendMin, cur)}–${formatCurrency(o.stipendMax, cur)}`, note: perShort };
    }
    return { value: formatCurrency((o.stipendMax ?? o.stipendMin)!, cur), note: perShort };
  }
  if (o.category === "scholarship" && o.awardAmount != null) {
    return { value: formatCurrency(o.awardAmount, o.currency ?? "INR"), note: "award" };
  }
  if ((o.category === "competition" || o.category === "hackathon") && o.prizeAmount != null && o.prizeAmount > 0) {
    return { value: formatCurrency(o.prizeAmount, o.currency ?? "USD"), note: "prize pool" };
  }
  return null;
}

export function relativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = now - t;
  if (diff < MS_HOUR) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < MS_DAY) return `${Math.floor(diff / MS_HOUR)}h ago`;
  if (diff < 30 * MS_DAY) return `${Math.floor(diff / MS_DAY)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export const CATEGORY_META: Record<
  Opportunity["category"],
  { label: string; singular: string; color: string; tint: string }
> = {
  internship: { label: "Internships", singular: "Internship", color: "var(--color-cat-internship)", tint: "cat-internship" },
  scholarship: { label: "Scholarships", singular: "Scholarship", color: "var(--color-cat-scholarship)", tint: "cat-scholarship" },
  competition: { label: "Competitions", singular: "Competition", color: "var(--color-cat-competition)", tint: "cat-competition" },
  hackathon: { label: "Hackathons", singular: "Hackathon", color: "var(--color-cat-hackathon)", tint: "cat-hackathon" },
};
