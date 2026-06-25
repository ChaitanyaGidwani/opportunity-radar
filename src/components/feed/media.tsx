"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import { hueFromString, initials } from "@/lib/logo";
import { CATEGORY_COLOR, CATEGORY_ICON } from "./category-icon";
import { cn } from "@/lib/utils";

/**
 * Org / source logo that walks a list of candidate URLs (explicit → Clearbit →
 * favicon) and finally falls back to a tasteful initials avatar — so a card is
 * never showing a broken image.
 */
export function OrgLogo({
  candidates,
  name,
  category,
  size = 44,
  rounded = "lg",
  className,
}: {
  candidates: string[];
  name?: string;
  category: Category;
  size?: number;
  rounded?: "lg" | "md" | "full";
  className?: string;
}) {
  const [i, setI] = useState(0);
  const src = candidates[i];
  const radius = rounded === "full" ? "rounded-full" : rounded === "md" ? "rounded-[7px]" : "rounded-xl";

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden bg-white", radius, className)}
      style={{ width: size, height: size, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setI((n) => n + 1)}
          className="h-full w-full object-contain p-[3px]"
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center font-semibold text-white"
          style={{
            fontSize: size * 0.4,
            background: `linear-gradient(135deg, hsl(${hueFromString(name ?? "x")} 62% 52%), ${CATEGORY_COLOR[category]})`,
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** Card cover: a real banner image, or a category-tinted gradient with a watermark icon. */
export function CardBanner({
  imageUrl,
  category,
  height = 104,
  fill = false,
}: {
  imageUrl?: string;
  category: Category;
  height?: number;
  fill?: boolean;
}) {
  const [err, setErr] = useState(false);
  const color = CATEGORY_COLOR[category];
  const hasImg = !!imageUrl && !err;
  const Icon = CATEGORY_ICON[category];
  const iconSize = fill ? 150 : Math.round(height * 0.85);

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-elevated", fill && "h-full min-h-[150px]")}
      style={fill ? undefined : { height }}
    >
      {hasImg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            onError={() => setErr(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/10" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${color} 28%, var(--color-surface)), color-mix(in oklab, ${color} 7%, var(--color-surface)))`,
          }}
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, color-mix(in oklab, ${color} 40%, transparent) 1px, transparent 0)`,
              backgroundSize: "14px 14px",
            }}
          />
          <Icon
            size={iconSize}
            strokeWidth={1.4}
            className="absolute -bottom-4 -right-3 opacity-[0.16]"
            style={{ color }}
          />
        </div>
      )}
    </div>
  );
}
