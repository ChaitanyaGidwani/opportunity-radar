"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useProfile } from "@/store/profile";

export function AIMatchReason({ opportunityId }: { opportunityId: string }) {
  const profile = useProfile((s) => s.profile);
  const onboarded = profile.onboarded;
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!onboarded) return;
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    (async () => {
      try {
        const res = await fetch("/api/ai/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId, profile }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setExplanation(data.match?.explanation ?? null);
      } catch {
        // Silently fail — the existing deterministic reasons are still shown
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [opportunityId, onboarded, profile]);

  if (!onboarded) return null;

  if (loading) {
    return (
      <div className="mt-2 flex items-start gap-2">
        <Sparkles size={13} className="mt-0.5 shrink-0 text-purple-500 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-elevated" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-elevated" />
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-purple-500/15 bg-purple-500/[0.04] px-3 py-2">
      <Sparkles size={13} className="mt-0.5 shrink-0 text-purple-500" />
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        {explanation}
      </p>
    </div>
  );
}
