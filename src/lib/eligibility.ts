import type { Opportunity, Profile } from "./types";

export interface EligibilityResult {
  ok: boolean;
  /** Human reasons the item was filtered out (for the debug panel / transparency). */
  failed: string[];
}

/**
 * STAGE 1 of ranking: boolean hard filters. Per research, we ONLY filter on
 * high-confidence parsed fields and treat any MISSING field — on either the
 * opportunity OR the profile — as ELIGIBLE, so noisy scraped data never wrongly
 * hides a valid opportunity. A closed deadline is the one unconditional drop.
 */
export function passesEligibility(
  o: Opportunity,
  p: Profile,
  now = Date.now(),
): EligibilityResult {
  const failed: string[] = [];
  const e = o.eligibility;

  // Closed opportunities are always dropped (unless rolling / no deadline).
  if (o.deadline) {
    const t = new Date(o.deadline).getTime();
    if (!isNaN(t) && t < now) failed.push("Deadline passed");
  }

  if (e) {
    // Branch gate
    if (e.branches?.length && p.branch && !e.branches.includes(p.branch)) {
      failed.push(`Restricted to ${e.branches.join(", ")}`);
    }
    // Year gate
    if (e.years?.length && p.year && !e.years.includes(p.year)) {
      failed.push(`For year ${e.years.join("/")} only`);
    }
    // CGPA gate — only if we KNOW the student's CGPA.
    if (e.minCGPA != null && p.cgpa != null && p.cgpa < e.minCGPA) {
      failed.push(`Needs CGPA ≥ ${e.minCGPA}`);
    }
    // State gate (scholarships) — only if we know the student's state.
    if (e.states?.length && p.state && !e.states.includes(p.state)) {
      failed.push("State-restricted scheme");
    }
    // Reserved-category gate — only if we know the student's category.
    if (e.socialCategories?.length && p.socialCategory && !e.socialCategories.includes(p.socialCategory)) {
      failed.push(`For ${e.socialCategories.join("/").toUpperCase()} category`);
    }
    // Gender gate (e.g. girl-child awards) — only if we know the student's gender.
    if (e.gender && p.gender && p.gender !== "prefer-not" && e.gender !== p.gender) {
      failed.push(e.gender === "female" ? "For women candidates" : "Gender-restricted");
    }
  }

  // Remote-only preference is the one location hard filter.
  if (p.remoteOnly && o.isRemote === false) {
    failed.push("Not remote");
  }

  return { ok: failed.length === 0, failed };
}
