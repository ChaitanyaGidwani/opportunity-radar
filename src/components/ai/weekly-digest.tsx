"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Clock, ArrowRight } from "lucide-react";   /* eslint-disable-line @typescript-eslint/no-unused-vars */
import type { WeeklyDigest as WeeklyDigestType } from "@/lib/types";
import { useProfile } from "@/store/profile";

export function WeeklyDigest() {
  const profile = useProfile((s) => s.profile);
  const onboarded = profile.onboarded;
  const [digest, setDigest] = useState<WeeklyDigestType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!onboarded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/digest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setDigest(data.digest ?? null);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [onboarded, profile]);

  if (!onboarded || loading || !digest) return null;

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.04] to-signal-500/[0.04] p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
          <Sparkles size={16} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Your weekly brief</h2>
          <p className="text-[11px] text-ink-3">AI-curated summary of what&apos;s new for you</p>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-ink-2">{digest.summary}</p>

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {digest.highlights.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/25 bg-signal-500/[0.08] px-2.5 py-1 text-[12px] font-medium text-signal-600"
            >
              <TrendingUp size={11} />
              {h.count} {h.category}{h.count > 1 ? "s" : ""}
              {h.note && <span className="text-ink-3">· {h.note}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Urgent deadlines */}
      {digest.urgentDeadlines.length > 0 && (
        <div className="mt-3 space-y-1">
          {digest.urgentDeadlines.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <Clock size={12} className="shrink-0 text-amber-600" />
              <span className="text-ink-2">{d.title}</span>
              <span className="ml-auto shrink-0 font-medium text-amber-600">
                {d.daysLeft <= 0 ? "Closing today!" : `${d.daysLeft}d left`}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-ink-3">✨ AI-generated · refreshed weekly</p>
    </section>
  );
}
