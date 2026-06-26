"use client";

import { Bookmark } from "lucide-react";
import type { ScoredOpportunity } from "@/lib/types";
import { CardBanner, OrgLogo } from "./media";
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_LABEL } from "./category-icon";
import { DeadlineCountdown } from "./deadline-countdown";
import { PingBar } from "../brand/ping-bar";
import { valueLabel } from "@/lib/format";
import { logoCandidates } from "@/lib/logo";
import { useCollections } from "@/store/collections";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";
import { AISmartTagsInline } from "../ai/ai-smart-tags";

export function OpportunityCard({
  scored,
  onOpen,
  index = 0,
  featured = false,
  featuredLabel = "Top pick",
}: {
  scored: ScoredOpportunity;
  onOpen: (s: ScoredOpportunity) => void;
  index?: number;
  featured?: boolean;
  featuredLabel?: string;
}) {
  const o = scored.opportunity;
  const saved = useCollections((s) => s.saved.includes(o.id));
  const toggleSaved = useCollections((s) => s.toggleSaved);
  const pushToast = useToastStore((s) => s.push);
  const val = valueLabel(o);
  const color = CATEGORY_COLOR[o.category];
  const Icon = CATEGORY_ICON[o.category];
  const logos = logoCandidates(o.logoUrl, o.sourceUrl);
  const pct = Math.round(scored.score * 100);

  const onSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaved(o.id);
    pushToast(saved ? "Removed from saved" : "Saved — we'll nudge you before it closes", saved ? "info" : "success");
  };

  const saveBtn = (cls?: string) => (
    <button
      onClick={onSave}
      aria-label={saved ? "Remove from saved" : "Save opportunity"}
      aria-pressed={saved}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full transition-colors",
        saved ? "text-signal-600" : "text-ink-2 hover:text-ink",
        cls,
      )}
    >
      <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
    </button>
  );

  const catChip = (cls?: string) => (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", cls)}
      style={{ color }}
    >
      <Icon size={12} strokeWidth={2.6} />
      {CATEGORY_LABEL[o.category]}
    </span>
  );

  const reasons =
    scored.reasons.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {scored.reasons.slice(0, 2).map((r, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-md border border-signal-500/25 bg-signal-500/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-signal-600"
          >
            {i === 0 && <span className="h-1.5 w-1.5 rounded-full bg-signal-500" />}
            {r}
          </span>
        ))}
      </div>
    ) : null;

  const footer = (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
      <DeadlineCountdown deadline={o.deadline} />
      {val && (
        <span className="font-mono text-[13px] text-ink">
          <span className="font-semibold">{val.value}</span>
          {val.note && <span className="ml-1 text-[11px] text-ink-3">{val.note}</span>}
        </span>
      )}
    </div>
  );

  const interaction = {
    onClick: () => onOpen(scored),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(scored);
      }
    },
    tabIndex: 0,
    role: "button",
    "aria-label": `${o.title} — ${o.category}`,
  };

  const matchGlyph = (
    <span className="flex shrink-0 items-center gap-1.5" title={`Match ${pct}%`}>
      <PingBar level={scored.matchLevel} />
      <span className="font-mono text-[11px] text-ink-3 tabular-nums">{pct}%</span>
    </span>
  );

  if (featured) {
    return (
      <article
        {...interaction}
        className="group relative col-span-1 flex h-full cursor-pointer flex-col overflow-hidden panel panel-hover motion-safe:animate-rise sm:col-span-2 sm:flex-row sm:items-stretch"
        style={{ animationDelay: `${Math.min(index, 14) * 35}ms` }}
      >
        <div className="relative sm:w-[42%] sm:shrink-0">
          <CardBanner imageUrl={o.imageUrl} category={o.category} fill />
          {catChip("bg-surface/95 shadow-sm absolute left-3 top-3")}
          <span className="absolute right-3 top-3 rounded-full bg-[#042522] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-signal-400">
            {featuredLabel}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <OrgLogo candidates={logos} name={o.organization ?? o.title} category={o.category} size={38} rounded="md" />
              <span className="truncate text-[13px] font-medium text-ink-2">{o.organization ?? o.sourceLabel}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {matchGlyph}
              {saveBtn()}
            </div>
          </div>
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-signal-600">
            {o.title}
          </h3>
          {o.summary && <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-2">{o.summary}</p>}
          {reasons}
          <AISmartTagsInline opportunityId={o.id} />
          {footer}
        </div>
      </article>
    );
  }

  return (
    <article
      {...interaction}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden panel panel-hover motion-safe:animate-rise"
      style={{ animationDelay: `${Math.min(index, 14) * 35}ms` }}
    >
      <div className="relative">
        <CardBanner imageUrl={o.imageUrl} category={o.category} />
        {catChip("bg-surface/95 shadow-sm absolute left-3 top-3")}
        {saveBtn("bg-surface/95 shadow-sm absolute right-3 top-3")}
        <OrgLogo
          candidates={logos}
          name={o.organization ?? o.title}
          category={o.category}
          size={46}
          className="absolute -bottom-5 left-4 shadow-sm ring-[3px] ring-surface"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-7">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-2">{o.organization ?? o.sourceLabel}</p>
          {matchGlyph}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-signal-600">
          {o.title}
        </h3>
        {reasons}
        <AISmartTagsInline opportunityId={o.id} />
        {footer}
      </div>
    </article>
  );
}
