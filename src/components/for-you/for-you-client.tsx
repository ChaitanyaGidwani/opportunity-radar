"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Pencil, Star, Clock } from "lucide-react";
import type { Category, ScoredOpportunity } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { useProfile } from "@/store/profile";
import { OpportunityCard } from "../feed/opportunity-card";
import { OpportunityDetail } from "../feed/opportunity-detail";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/primitives";
import { BRANCHES, SKILL_LABELS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const BRANCH_LABEL: Record<string, string> = Object.fromEntries(BRANCHES.map((b) => [b.slug, b.label]));
const CAT_RAIL: Record<Category, string> = {
  internship: "Internships for you",
  scholarship: "Scholarships you qualify for",
  competition: "Competitions for you",
  hackathon: "Hackathons for you",
};
const MS_DAY = 86_400_000;

export function ForYouClient() {
  const profile = useProfile((s) => s.profile);
  const hydrated = useProfile((s) => s.hydrated);
  const [items, setItems] = useState<ScoredOpportunity[] | null>(null);
  const [selected, setSelected] = useState<ScoredOpportunity | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, sort: "match" }),
        });
        const json = await res.json();
        if (!cancelled) setItems(json.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, profile]);

  const byCat = useMemo(() => {
    const m: Record<Category, ScoredOpportunity[]> = { internship: [], scholarship: [], competition: [], hackathon: [] };
    (items ?? []).forEach((s) => m[s.opportunity.category].push(s));
    return m;
  }, [items]);

  const closingSoon = useMemo(
    () =>
      (items ?? [])
        .filter((s) => {
          const d = s.opportunity.deadline ? new Date(s.opportunity.deadline).getTime() : null;
          return d != null && d >= now && d - now <= 14 * MS_DAY;
        })
        .sort((a, b) => new Date(a.opportunity.deadline!).getTime() - new Date(b.opportunity.deadline!).getTime())
        .slice(0, 10),
    [items, now],
  );

  const topPicks = (items ?? []).slice(0, 10);
  const onboarded = profile.onboarded;
  const branchLabel = profile.branch ? BRANCH_LABEL[profile.branch] : null;
  const topSkills = (profile.skills ?? []).slice(0, 3).map((s) => SKILL_LABELS[s] ?? s);
  const summary = [branchLabel, profile.year ? `Year ${profile.year}` : null, ...topSkills].filter(Boolean).join(" · ");
  const cats = CATEGORIES.filter((c) => (profile.interests.length ? profile.interests.includes(c) : true));

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      {onboarded ? (
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
            <Star size={20} className="text-signal-600" /> For you
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
            {summary || "Curated from every live source"}
            <Link href="/profile" className="inline-flex items-center gap-1 text-signal-600 hover:text-signal-700">
              <Pencil size={12} /> Edit
            </Link>
          </p>
        </div>
      ) : (
        <PersonalizeHero />
      )}

      {items === null ? (
        <RailSkeletons />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-2">
          No opportunities to show right now.
        </p>
      ) : (
        <>
          {onboarded && closingSoon.length > 0 && (
            <Rail title="Closing soon for you" subtitle="Don't miss these deadlines" items={closingSoon} onOpen={setSelected} urgent />
          )}
          <Rail
            title={onboarded ? "Your top matches" : "Top picks"}
            subtitle={onboarded ? "Ranked by your skills, interests & deadlines" : "Personalise to make these truly yours"}
            items={topPicks}
            onOpen={setSelected}
          />
          {cats.map((c) => (
            <Rail key={c} title={CAT_RAIL[c]} items={byCat[c].slice(0, 10)} onOpen={setSelected} />
          ))}
        </>
      )}

      <OpportunityDetail scored={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PersonalizeHero() {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-signal-500/20 bg-signal-500/[0.04] p-6 sm:p-8">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-8 sm:text-left">
        <div className="shrink-0">
          <span className="grid h-[116px] w-[116px] place-items-center rounded-3xl bg-signal-500/10 text-signal-600">
            <Star size={46} strokeWidth={1.6} />
          </span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">A feed made for you</h1>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-2">
            Add your branch, year and skills — we’ll hide what you can’t apply to, rank the rest for you, and nudge you
            before every deadline.
          </p>
          <Link href="/onboarding" className="mt-4 inline-block">
            <Button size="lg">
              Personalise my feed <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Rail({
  title,
  subtitle,
  items,
  onOpen,
  urgent,
}: {
  title: string;
  subtitle?: string;
  items: ScoredOpportunity[];
  onOpen: (s: ScoredOpportunity) => void;
  urgent?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className={cn("flex items-center gap-2 text-lg font-semibold text-ink")}>
            {urgent && <Clock size={16} className="text-danger" />}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
        </div>
        <Link
          href="/feed"
          className="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-signal-600 hover:text-signal-700 sm:inline-flex"
        >
          See all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {items.map((s, i) => (
          <div key={s.opportunity.id} className="w-[280px] shrink-0 snap-start sm:w-[300px]">
            <OpportunityCard scored={s} onOpen={onOpen} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

function RailSkeletons() {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((r) => (
        <div key={r}>
          <Skeleton className="mb-3 h-6 w-52" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-[280px] shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
