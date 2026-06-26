"use client";

import { useState } from "react";
import {
  Bookmark,
  CalendarPlus,
  Check,
  ChevronDown,
  ExternalLink,
  BadgeCheck,
  X,
  ShieldCheck,
  Download,
} from "lucide-react";
import type { ScoreBreakdown, ScoredOpportunity } from "@/lib/types";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Tag } from "../ui/primitives";
import { CardBanner, OrgLogo } from "./media";
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_LABEL } from "./category-icon";
import { DeadlineCountdown } from "./deadline-countdown";
import { PingBar } from "../brand/ping-bar";
import { valueLabel, formatDate, relativeTime } from "@/lib/format";
import { BRANCHES, SKILL_LABELS, STATE_LABELS } from "@/lib/taxonomy";
import { googleCalendarUrl } from "@/lib/ics";
import { logoCandidates } from "@/lib/logo";
import { useCollections } from "@/store/collections";
import { cn } from "@/lib/utils";
import { AISummary } from "../ai/ai-summary";
import { AIMatchReason } from "../ai/ai-match-reason";
import { AISmartTags } from "../ai/ai-smart-tags";
import { AIDeadlineInsight } from "../ai/ai-deadline-insight";
import { ResumeMatch } from "../ai/resume-match";

const BRANCH_LABEL: Record<string, string> = Object.fromEntries(BRANCHES.map((b) => [b.slug, b.label]));

const SIGNAL_LABEL: Record<keyof ScoreBreakdown, string> = {
  skill: "Skills match",
  interest: "Your interests",
  urgency: "Deadline urgency",
  recency: "Freshly posted",
  popularity: "Popularity",
  location: "Location fit",
  semantic: "Semantic match",
};

function EligibilityChips({ scored }: { scored: ScoredOpportunity }) {
  const e = scored.opportunity.eligibility;
  const chips: string[] = [];
  if (e?.branches?.length) chips.push(...e.branches.map((b) => BRANCH_LABEL[b] ?? b));
  if (e?.years?.length) chips.push(`Year ${e.years.join(" / ")}`);
  if (e?.minCGPA != null) chips.push(`CGPA ≥ ${e.minCGPA}`);
  if (e?.socialCategories?.length) chips.push(e.socialCategories.map((c) => c.toUpperCase()).join(" / "));
  if (e?.gender) chips.push(e.gender === "female" ? "Women candidates" : "Men candidates");
  if (e?.states?.length) chips.push(...e.states.map((s) => STATE_LABELS[s] ?? s));

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.length === 0 ? (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-success">
          <ShieldCheck size={14} /> Open to all — no eligibility restrictions detected
        </span>
      ) : (
        chips.map((c, i) => (
          <span key={i} className="rounded-md border border-line bg-elevated px-2 py-0.5 text-[12px] text-ink-2">
            {c}
          </span>
        ))
      )}
      {e?.raw && <p className="mt-1 w-full text-[12px] leading-relaxed text-ink-3">“{e.raw}”</p>}
    </div>
  );
}

function ScoreBreakdownView({ scored }: { scored: ScoredOpportunity }) {
  const keys = (Object.keys(scored.rawSignals) as (keyof ScoreBreakdown)[]).filter(
    (k) => k !== "semantic" && scored.rawSignals[k] != null,
  );
  keys.sort((a, b) => (scored.breakdown[b] ?? 0) - (scored.breakdown[a] ?? 0));

  return (
    <div className="space-y-2">
      {keys.map((k) => {
        const raw = scored.rawSignals[k] ?? 0;
        const contribution = Math.round((scored.breakdown[k] ?? 0) * 100);
        return (
          <div key={k} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[12px] text-ink-2">{SIGNAL_LABEL[k]}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full bg-signal-500/70" style={{ width: `${Math.round(raw * 100)}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[11px] text-ink-3 tabular-nums">+{contribution}</span>
          </div>
        );
      })}
      <p className="pt-1 text-[11px] text-ink-3">
        Transparent, deterministic ranking — no pay-to-rank, no black box. “+N” is each signal’s weighted
        contribution to the {Math.round(scored.score * 100)}% match.
      </p>
    </div>
  );
}

export function OpportunityDetail({
  scored,
  onClose,
}: {
  scored: ScoredOpportunity | null;
  onClose: () => void;
}) {
  const [showMath, setShowMath] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const saved = useCollections((s) => (scored ? s.saved.includes(scored.opportunity.id) : false));
  const applied = useCollections((s) => (scored ? s.applied.includes(scored.opportunity.id) : false));
  const toggleSaved = useCollections((s) => s.toggleSaved);
  const setApplied = useCollections((s) => s.setApplied);

  if (!scored) return null;
  const o = scored.opportunity;
  const val = valueLabel(o);
  const logos = logoCandidates(o.logoUrl, o.sourceUrl);
  const Icon = CATEGORY_ICON[o.category];

  return (
    <Modal open={!!scored} onClose={onClose} label={o.title}>
      {/* banner header */}
      <div className="relative">
        <CardBanner imageUrl={o.imageUrl} category={o.category} height={150} />
        <span
          className="bg-surface/95 shadow-sm absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: CATEGORY_COLOR[o.category] }}
        >
          <Icon size={12} strokeWidth={2.6} />
          {CATEGORY_LABEL[o.category]}
        </span>
        <button onClick={onClose} aria-label="Close" className="bg-surface/95 shadow-sm absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-ink hover:text-signal-600">
          <X size={18} />
        </button>
        <OrgLogo
          candidates={logos}
          name={o.organization ?? o.title}
          category={o.category}
          size={64}
          className="absolute -bottom-7 left-5 shadow-md ring-4 ring-surface"
        />
      </div>

      <div className="space-y-5 px-5 pb-5 pt-10">
        <div>
          <h2 className="text-xl font-semibold leading-tight text-ink">{o.title}</h2>
          {o.organization && <p className="mt-1 text-sm text-ink-2">{o.organization}</p>}
        </div>

        {/* key metrics */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-base/40 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-ink-3">Deadline</span>
            <DeadlineCountdown deadline={o.deadline} size="md" />
            {o.deadline && <span className="mt-0.5 text-[11px] text-ink-3">{formatDate(o.deadline)}</span>}
          </div>
          {val && (
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-ink-3">{val.note || "Value"}</span>
              <span className="font-mono text-[15px] font-semibold text-ink">{val.value}</span>
            </div>
          )}
          {o.location && (
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-ink-3">Location</span>
              <span className="text-[14px] text-ink">{o.isRemote ? "Remote" : o.location}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-ink-3">Match</span>
            <span className="flex items-center gap-1.5">
              <PingBar level={scored.matchLevel} />
              <span className="font-mono text-[14px] font-semibold text-signal-600">{Math.round(scored.score * 100)}%</span>
            </span>
          </div>
        </div>

        {/* AI deadline insight (Feature 7) */}
        <AIDeadlineInsight opportunityId={o.id} hasDeadline={!!o.deadline} />

        {/* why this matched */}
        {scored.reasons.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <BadgeCheck size={14} className="text-signal-500" /> Why this matched you
            </p>
            <div className="flex flex-wrap gap-1.5">
              {scored.reasons.map((r, i) => (
                <span key={i} className="rounded-md border border-signal-500/20 bg-signal-500/[0.08] px-2 py-1 text-[12px] font-medium text-signal-600">
                  {r}
                </span>
              ))}
            </div>
            {/* AI match explanation (Feature 2) */}
            <AIMatchReason opportunityId={o.id} />
            <button onClick={() => setShowMath((v) => !v)} className="flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-2">
              <ChevronDown size={13} className={cn("transition-transform", showMath && "rotate-180")} /> How this was scored
            </button>
            {showMath && (
              <div className="rounded-xl border border-line bg-base/40 p-3">
                <ScoreBreakdownView scored={scored} />
              </div>
            )}
          </div>
        )}

        {/* AI Summary (Feature 1) — replaces plain summary with structured AI analysis */}
        <AISummary opportunityId={o.id} fallbackSummary={o.summary} />

        {/* Resume match (Feature 6) */}
        <ResumeMatch opportunityId={o.id} />

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">Eligibility</p>
          <EligibilityChips scored={scored} />
        </div>

        {o.tags.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">Skills & themes</p>
            <div className="flex flex-wrap gap-1.5">
              {o.tags.map((t) => (
                <Tag key={t}>{SKILL_LABELS[t] ?? t}</Tag>
              ))}
            </div>
            {/* AI Smart Tags (Feature 3) */}
            <div className="mt-2">
              <AISmartTags opportunityId={o.id} />
            </div>
          </div>
        )}

        <p className="text-[11px] text-ink-3">
          Sourced via <span className="text-ink-2">{o.sourceLabel}</span> · verified {relativeTime(o.lastVerified)} ·
          you’ll apply on the original site.
        </p>
      </div>

      {/* Sticky actions */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-line bg-surface px-5 py-3">
        <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[160px]">
          <Button className="w-full" size="md">
            Apply on {o.sourceLabel} <ExternalLink size={15} />
          </Button>
        </a>
        <Button variant="secondary" size="icon" aria-label={saved ? "Unsave" : "Save"} onClick={() => toggleSaved(o.id)}>
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} className={saved ? "text-signal-500" : ""} />
        </Button>
        <Button
          variant={applied ? "primary" : "secondary"}
          size="md"
          onClick={() => setApplied(o.id, !applied)}
          title="Track as applied"
        >
          {applied ? <><Check size={15} /> Applied</> : "Mark applied"}
        </Button>
        {o.deadline && (
          <div className="relative">
            <Button variant="secondary" size="icon" aria-label="Add to calendar" onClick={() => setCalOpen((v) => !v)}>
              <CalendarPlus size={17} />
            </Button>
            {calOpen && (
              <div className="absolute bottom-11 right-0 w-48 overflow-hidden rounded-xl border border-line-strong bg-elevated py-1 shadow-xl">
                <a
                  href={googleCalendarUrl(o)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setCalOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-surface"
                >
                  <CalendarPlus size={14} /> Google Calendar
                </a>
                <a
                  href={`/api/ics/${encodeURIComponent(o.id)}`}
                  onClick={() => setCalOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-surface"
                >
                  <Download size={14} /> Download .ics
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
