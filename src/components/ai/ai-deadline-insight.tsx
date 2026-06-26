"use client";

import { useEffect, useState } from "react";
import { Sparkles, Clock } from "lucide-react";
import { useProfile } from "@/store/profile";

export function AIDeadlineInsight({ opportunityId, hasDeadline }: { opportunityId: string; hasDeadline: boolean }) {
  const profile = useProfile((s) => s.profile);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasDeadline) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/deadline-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId, profile }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setInsight(data.insight ?? null);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [opportunityId, hasDeadline, profile]);

  if (!hasDeadline || loading) return null;
  if (!insight) return null;

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2">
      <Clock size={13} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="text-[12px] leading-relaxed text-amber-800">
        {insight}
      </p>
    </div>
  );
}
