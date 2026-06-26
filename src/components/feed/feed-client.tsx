"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Filter, Activity, Inbox, AlertTriangle, CheckCircle2, XCircle, Star, X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import type { Category, ScoredOpportunity, SourceRun } from "@/lib/types";
import type { Facets, FilterState, SortKey } from "@/lib/feed";
import { useProfile } from "@/store/profile";
import { OpportunityCard } from "./opportunity-card";
import { OpportunityDetail } from "./opportunity-detail";
import { FilterBar } from "./filter-bar";
import { CATEGORY_ICON, CATEGORY_LABEL } from "./category-icon";
import { Skeleton } from "../ui/primitives";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface FeedResponse {
  items: ScoredOpportunity[];
  facets: Facets;
  broadened: boolean;
  total: number;
  eligibleTotal: number;
  updatedAt: string;
  runs: SourceRun[];
}

export function FeedClient({ initialCategory }: { initialCategory?: Category } = {}) {
  const profile = useProfile((s) => s.profile);
  const hydrated = useProfile((s) => s.hydrated);

  const [filter, setFilter] = useState<FilterState>(initialCategory ? { categories: [initialCategory] } : {});
  const [sort, setSort] = useState<SortKey>("closing");
  const [data, setData] = useState<FeedResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "refetching" | "idle" | "error">("loading");
  const [rescanning, setRescanning] = useState(false);
  const [selected, setSelected] = useState<ScoredOpportunity | null>(null);
  const [showPersonalize, setShowPersonalize] = useState(true);
  const hasData = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const run = async () => {
      setStatus(hasData.current ? "refetching" : "loading");
      try {
        const res = await fetch("/api/feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, filter, sort, scope: "all" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as FeedResponse;
        if (!cancelled) {
          setData(json);
          hasData.current = true;
          setStatus("idle");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    const t = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [hydrated, profile, filter, sort]);

  // ── Semantic search (Feature 4) ────────────────────────────────────────────
  const [aiSearching, setAiSearching] = useState(false);
  const [aiTerms, setAiTerms] = useState<string[]>([]);

  useEffect(() => {
    if (!filter.query || filter.query.trim().length < 5) {
      setAiTerms([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setAiSearching(true);
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: filter.query, profile }),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) {
          setAiTerms(json.expandedTerms ?? []);
          // Merge AI results into the existing data if we have some
          if (data && json.items?.length) {
            const existingIds = new Set(data.items.map((i: any) => i.opportunity.id));
            const newItems = json.items.filter((i: any) => !existingIds.has(i.opportunity.id));
            if (newItems.length > 0) {
              setData((prev) => prev ? {
                ...prev,
                items: [...prev.items, ...newItems],
                total: prev.total + newItems.length,
              } : prev);
            }
          }
        }
      } catch {
        // Silently fail — keyword search still works
      } finally {
        if (!cancelled) setAiSearching(false);
      }
    }, 800); // Debounce
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filter.query, profile, data]);

  const rescan = async () => {
    setRescanning(true);
    try {
      await fetch("/api/ingest", { method: "POST" });
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, filter, sort, scope: "all" }),
      });
      if (res.ok) setData((await res.json()) as FeedResponse);
    } finally {
      setRescanning(false);
    }
  };

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="mb-5">
        {initialCategory ? (
          (() => {
            const CatIcon = CATEGORY_ICON[initialCategory];
            const catCount = data?.facets.category[initialCategory];
            return (
              <>
                <Link href="/feed" className="mb-1.5 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-2">
                  <ArrowLeft size={13} /> All categories
                </Link>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
                  <CatIcon size={22} className="text-signal-600" />
                  {CATEGORY_LABEL[initialCategory]}s
                </h1>
                <p className="mt-1 text-sm text-ink-2">
                  {catCount != null ? (
                    <>
                      <span className="font-semibold text-ink">{catCount.toLocaleString("en-IN")}</span> live · aggregated
                      from every source
                    </>
                  ) : (
                    "Loading…"
                  )}
                </p>
              </>
            );
          })()
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Explore opportunities</h1>
            <p className="mt-1 text-sm text-ink-2">
              {data ? (
                <>
                  <span className="font-semibold text-ink">{data.eligibleTotal.toLocaleString("en-IN")}</span> live across
                  internships, scholarships, competitions &amp; hackathons
                  {data.facets.closingThisWeek > 0 && (
                    <>
                      {" · "}
                      <span className="font-medium text-amber">{data.facets.closingThisWeek}</span> closing this week
                    </>
                  )}
                </>
              ) : (
                "Internships · scholarships · competitions · hackathons — aggregated live"
              )}
            </p>
          </>
        )}
      </div>

      {/* Personalise banner (optional — never a gate) */}
      {hydrated && !profile.onboarded && showPersonalize && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-signal-500/30 bg-signal-500/[0.06] p-3.5 sm:p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-signal-500/15 text-signal-600">
            <Star size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">Personalise your feed</p>
            <p className="text-[12.5px] text-ink-2">Add your branch, year & skills so we hide what you can’t apply to and rank the rest. Takes 30 seconds.</p>
          </div>
          <Link href="/onboarding" className="shrink-0">
            <Button size="sm">
              Set up <ArrowRight size={15} />
            </Button>
          </Link>
          <button onClick={() => setShowPersonalize(false)} aria-label="Dismiss" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-elevated">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-line bg-base px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
        <FilterBar
          filter={filter}
          setFilter={setFilter}
          sort={sort}
          setSort={setSort}
          facets={data?.facets ?? null}
          onRescan={rescan}
          rescanning={rescanning}
          updatedAt={data?.updatedAt}
          lockedCategory={initialCategory}
        />
        {/* AI search indicator */}
        {(aiSearching || aiTerms.length > 0) && filter.query && (
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <Sparkles size={12} className={cn("text-purple-500", aiSearching && "animate-pulse")} />
            <span className="text-purple-600 font-medium">
              {aiSearching ? "AI expanding search…" : `AI-enhanced search · ${aiTerms.length} related terms`}
            </span>
          </div>
        )}
      </div>

      {/* broadened banner */}
      {data?.broadened && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber/30 bg-amber/[0.06] px-4 py-3 text-[13px] text-amber">
          <Filter size={16} className="mt-0.5 shrink-0" />
          <span>
            Nothing matched your exact filters, so we broadened the search. Adjust your profile or filters to sharpen
            these results.
          </span>
        </div>
      )}

      {/* refetch progress hairline */}
      {status === "refetching" && (
        <div className="mt-4 h-0.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-[sweep_1s_linear_infinite] bg-signal-500" />
        </div>
      )}

      {/* Results */}
      <div className="mt-5">
        {status === "loading" && !data && <LoadingState />}

        {status === "error" && !data && (
          <EmptyBox
            icon={<AlertTriangle className="text-danger" />}
            title="Lost signal"
            body="We couldn't reach the live sources. Check your connection and retry."
            action={<Button onClick={rescan}>Retry scan</Button>}
          />
        )}

        {data && data.items.length === 0 && status !== "loading" && (
          <EmptyBox
            icon={<Inbox className="text-ink-3" />}
            title="No signals in range"
            body="No opportunities match these filters right now. Try widening the deadline window or clearing filters."
            action={
              <Button variant="secondary" onClick={() => setFilter({})}>
                Clear filters
              </Button>
            }
          />
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((s, i) => (
                <OpportunityCard key={s.opportunity.id} scored={s} onOpen={setSelected} index={i} />
              ))}
            </div>
            <SourceHealth runs={data.runs} />
          </>
        )}
      </div>

      <OpportunityDetail scored={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="panel overflow-hidden">
          <Skeleton className="h-[104px] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBox({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-elevated [&>svg]:h-6 [&>svg]:w-6">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-2">{body}</p>
      {action}
    </div>
  );
}

function SourceHealth({ runs }: { runs: SourceRun[] }) {
  const [open, setOpen] = useState(false);
  if (!runs?.length) return null;
  const ok = runs.filter((r) => r.ok).length;
  const total = runs.reduce((n, r) => n + r.count, 0);
  return (
    <div className="mt-6 rounded-xl border border-line bg-surface/50 px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-[13px] text-ink-2">
        <Activity size={15} className="text-signal-500" />
        <span className="font-medium text-ink">{ok}/{runs.length} sources live</span>
        <span className="text-ink-3">· {total} listings aggregated</span>
        <span className="ml-auto text-ink-3">{open ? "Hide" : "Details"}</span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {runs.map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 text-[12px]">
              {r.ok ? (
                <CheckCircle2 size={13} className="text-success" />
              ) : (
                <XCircle size={13} className="text-danger" />
              )}
              <span className="text-ink-2">{r.label}</span>
              <span className={cn("ml-auto font-mono tabular-nums", r.ok ? "text-ink-3" : "text-danger")}>
                {r.ok ? r.count : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
