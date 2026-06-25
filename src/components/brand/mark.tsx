import { cn } from "@/lib/utils";

/** Brand mark: a solid rounded tile with an upward "aim" arrow — Argus = goal/aim. */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-signal-500)" />
      <path d="M16 7.5 L24 23.6 L16 19.3 L8 23.6 Z" fill="white" />
    </svg>
  );
}

export function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="font-display font-bold tracking-tight text-ink" style={{ fontSize: size * 0.72 }}>
        Argus
      </span>
    </span>
  );
}
