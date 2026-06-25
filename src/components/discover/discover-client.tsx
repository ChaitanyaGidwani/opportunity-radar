"use client";

import { useEffect, useState } from "react";
import type { ScoredOpportunity } from "@/lib/types";
import type { Facets } from "@/lib/feed";
import { useProfile } from "@/store/profile";
import { CategoryTiles } from "./category-tiles";
import { Rail } from "../feed/rail";
import { OpportunityDetail } from "../feed/opportunity-detail";

interface FeedResp {
  items: ScoredOpportunity[];
  facets: Facets;
  updatedAt: string;
}

const MS = 86_400_000;

export function DiscoverClient() {
  const profile = useProfile((s) => s.profile);
  const hydrated = useProfile((s) => s.hydrated);
  const [data, setData] = useState<FeedResp | null>(null);
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
          body: JSON.stringify({ profile, sort: "closing", scope: "all" }),
        });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        /* keep skeletons */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, profile]);

  const items = data?.items ?? [];

  const closingSoon = [...items]
    .filter((s) => {
      const d = s.opportunity.deadline ? new Date(s.opportunity.deadline).getTime() : null;
      return d != null && d >= now && d - now <= 30 * MS;
    })
    .sort((a, b) => new Date(a.opportunity.deadline!).getTime() - new Date(b.opportunity.deadline!).getTime())
    .slice(0, 9);

  const forYou = [...items].sort((a, b) => b.score - a.score).slice(0, 9);

  const fresh = [...items]
    .filter((s) => s.opportunity.postedAt)
    .sort((a, b) => new Date(b.opportunity.postedAt!).getTime() - new Date(a.opportunity.postedAt!).getTime())
    .slice(0, 9);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      {/* hero */}
      <header className="mb-6">
        <h1 className="font-display text-[2rem] font-bold leading-[1.04] tracking-tight text-ink sm:text-[2.6rem]">
          Every opportunity,
          <br />
          <span className="text-signal-600">made for you.</span>
        </h1>
        <p className="mt-2.5 text-sm text-ink-2">
          {data ? (
            <>
              <span className="font-semibold text-ink">{data.facets.total.toLocaleString("en-IN")}</span> live across every
              source
              {data.facets.closingThisWeek > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-amber">{data.facets.closingThisWeek}</span> closing this week
                </>
              )}
            </>
          ) : (
            "Aggregating live internships, scholarships, competitions & hackathons…"
          )}
        </p>
      </header>

      {/* category tiles */}
      <div className="mb-7">
        <CategoryTiles facets={data?.facets ?? null} />
      </div>

      {/* rails */}
      <Rail title="Closing soon" subtitle="Deadlines you can still catch" href="/c/internship" items={closingSoon} onOpen={setSelected} loading={!data} urgent />
      {(profile.onboarded || forYou.length > 0) && (
        <Rail title="For you" subtitle={profile.onboarded ? "Matched to your profile" : "Personalise to sharpen these"} href="/for-you" items={forYou} onOpen={setSelected} loading={!data} />
      )}
      <Rail title="Fresh this week" items={fresh} onOpen={setSelected} loading={!data} />

      <OpportunityDetail scored={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
