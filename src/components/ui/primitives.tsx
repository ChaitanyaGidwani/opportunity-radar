"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Chip (toggleable filter / tag) ───────────────────────────────────────────
export function Chip({
  active,
  children,
  onClick,
  count,
  color,
  className,
  as = "button",
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  count?: number;
  color?: string;
  className?: string;
  as?: "button" | "span";
}) {
  const Comp = as;
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-[13px] font-medium transition-colors",
        as === "button" && "cursor-pointer",
        active
          ? "border-signal-500/50 bg-signal-500/10 text-signal-600"
          : "border-line-strong text-ink-2 hover:text-ink hover:border-ink-3",
        className,
      )}
      style={active && color ? { borderColor: `${color}66`, color, background: `${color}1a` } : undefined}
    >
      {children}
      {count != null && (
        <span className={cn("text-[11px] tabular-nums", active ? "opacity-80" : "text-ink-3")}>{count}</span>
      )}
    </Comp>
  );
}

// ── Tag (static skill pill) ──────────────────────────────────────────────────
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-elevated border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Toggle switch ────────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-signal-500" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-block h-[18px] w-[18px] transform rounded-full bg-white transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-full bg-elevated border border-line p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 h-8 rounded-full text-[13px] font-medium transition-colors",
            value === o.value ? "bg-signal-500 text-[#042522]" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
