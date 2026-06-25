"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { ScoredOpportunity } from "@/lib/types";
import { OpportunityCard } from "./opportunity-card";
import { Skeleton } from "../ui/primitives";

export function Rail({
  title,
  subtitle,
  items,
  onOpen,
  href,
  loading = false,
  urgent = false,
}: {
  title: string;
  subtitle?: string;
  items: ScoredOpportunity[];
  onOpen: (s: ScoredOpportunity) => void;
  href?: string;
  loading?: boolean;
  urgent?: boolean;
}) {
  if (!loading && items.length === 0) return null;

  return (
    <section className="mb-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            {/* Unstop-style section accent bar */}
            <span className="inline-block h-[18px] w-[3px] rounded-full" style={{ background: urgent ? "var(--color-amber)" : "var(--color-signal-500)" }} />
            {urgent && <Clock size={15} className="text-amber" />}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 pl-3 text-[13px] text-ink-2">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-signal-600 hover:text-signal-700">
            See all <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60 w-[280px] shrink-0" />)
          : items.map((s, i) => (
              <div key={s.opportunity.id} className="w-[280px] shrink-0 snap-start">
                <OpportunityCard scored={s} onOpen={onOpen} index={i} />
              </div>
            ))}
      </div>
    </section>
  );
}
