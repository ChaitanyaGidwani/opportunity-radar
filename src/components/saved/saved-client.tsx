"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, CircleCheckBig } from "lucide-react";
import type { ScoredOpportunity } from "@/lib/types";
import { useProfile } from "@/store/profile";
import { useCollections } from "@/store/collections";
import { OpportunityCard } from "../feed/opportunity-card";
import { OpportunityDetail } from "../feed/opportunity-detail";
import { Spinner } from "../ui/primitives";
import { cn } from "@/lib/utils";

export function SavedClient() {
  const profile = useProfile((s) => s.profile);
  const phyd = useProfile((s) => s.hydrated);
  const saved = useCollections((s) => s.saved);
  const applied = useCollections((s) => s.applied);
  const chyd = useCollections((s) => s.hydrated);

  const [tab, setTab] = useState<"saved" | "applied">("saved");
  const [items, setItems] = useState<ScoredOpportunity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScoredOpportunity | null>(null);

  const ids = useMemo(() => [...new Set([...saved, ...applied])], [saved, applied]);
  const idsKey = ids.join(",");

  useEffect(() => {
    if (!phyd || !chyd) return;
    let cancelled = false;
    (async () => {
      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, ids }),
        });
        const json = await res.json();
        if (!cancelled) {
          setItems(json.items ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phyd, chyd, idsKey, profile]);

  const list = (items ?? [])
    .filter((s) => (tab === "saved" ? saved.includes(s.opportunity.id) : applied.includes(s.opportunity.id)))
    .sort((a, b) => {
      const da = a.opportunity.deadline ? new Date(a.opportunity.deadline).getTime() : Infinity;
      const db = b.opportunity.deadline ? new Date(b.opportunity.deadline).getTime() : Infinity;
      return da - db;
    });

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Saved & tracked</h1>
      <p className="mt-1 text-sm text-ink-2">Your shortlist and applications — we’ll nudge you before each deadline.</p>

      <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
        {(
          [
            { key: "saved", label: "Saved", count: saved.length, icon: Bookmark },
            { key: "applied", label: "Applied", count: applied.length, icon: CircleCheckBig },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 h-9 text-[13px] font-medium transition-colors",
              tab === t.key ? "bg-elevated text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            <t.icon size={15} className={tab === t.key ? "text-signal-500" : ""} />
            {t.label}
            <span className="text-[11px] tabular-nums text-ink-3">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading && (
          <div className="flex items-center justify-center py-20 text-ink-3">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-elevated text-ink-3">
              {tab === "saved" ? <Bookmark size={22} /> : <CircleCheckBig size={22} />}
            </div>
            <h3 className="text-base font-semibold text-ink">{tab === "saved" ? "Nothing saved yet" : "No applications tracked"}</h3>
            <p className="max-w-sm text-sm text-ink-2">
              {tab === "saved"
                ? "Tap the bookmark on any opportunity to save it here and get deadline nudges."
                : "Mark opportunities as applied to keep your applications in one place."}
            </p>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.map((s, i) => (
              <OpportunityCard key={s.opportunity.id} scored={s} onOpen={setSelected} index={i} />
            ))}
          </div>
        )}
      </div>

      <OpportunityDetail scored={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
