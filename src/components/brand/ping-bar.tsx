import { cn } from "@/lib/utils";

/** Signal-strength glyph: 1–3 bars encoding match level. */
export function PingBar({
  level,
  className,
  title,
}: {
  level: 1 | 2 | 3;
  className?: string;
  title?: string;
}) {
  const heights = ["h-1.5", "h-2.5", "h-3.5"];
  return (
    <span
      className={cn("inline-flex items-end gap-[2px]", className)}
      title={title ?? `Match strength ${level}/3`}
      aria-label={title ?? `Match strength ${level} of 3`}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-[1px] transition-colors",
            heights[i],
            i < level ? "bg-signal-500" : "bg-line-strong",
          )}
        />
      ))}
    </span>
  );
}
