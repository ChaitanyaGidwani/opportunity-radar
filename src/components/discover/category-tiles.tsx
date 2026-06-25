"use client";

import Link from "next/link";
import type { Facets } from "@/lib/feed";
import { CATEGORIES } from "@/lib/types";
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_LABEL } from "../feed/category-icon";

/** The signature Unstop-style entry grid, in our "signal" identity. Tap → category listing. */
export function CategoryTiles({ facets }: { facets: Facets | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CATEGORIES.map((c) => {
        const Icon = CATEGORY_ICON[c];
        const color = CATEGORY_COLOR[c];
        const count = facets?.category[c];
        return (
          <Link
            key={c}
            href={`/c/${c}`}
            className="group relative overflow-hidden rounded-2xl border border-line p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop"
            style={{ background: `linear-gradient(150deg, color-mix(in oklab, ${color} 13%, var(--color-surface)), var(--color-surface) 70%)` }}
          >
            <span className="absolute right-3 top-3 flex items-center gap-1 text-[10px] font-medium text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse-soft" style={{ background: color }} />
              live
            </span>

            <span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
            >
              <Icon size={22} strokeWidth={2.2} />
            </span>

            <div className="mt-3">
              <p className="text-[14px] font-semibold text-ink">{CATEGORY_LABEL[c]}s</p>
              <p className="font-mono text-[12px] tabular-nums text-ink-2">{count != null ? `${count} live` : "…"}</p>
            </div>

            <Icon
              size={66}
              strokeWidth={1.2}
              className="pointer-events-none absolute -bottom-3 -right-2 opacity-[0.08] transition-transform duration-300 group-hover:scale-110"
              style={{ color }}
            />
          </Link>
        );
      })}
    </div>
  );
}
