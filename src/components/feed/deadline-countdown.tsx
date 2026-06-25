"use client";

import { useEffect, useState } from "react";
import { Clock, Infinity as InfinityIcon } from "lucide-react";
import { deadlineInfo } from "@/lib/format";
import { cn } from "@/lib/utils";

const URGENCY_CLASS: Record<string, string> = {
  imminent: "text-danger",
  soon: "text-amber",
  approaching: "text-amber/80",
  normal: "text-ink-2",
  passed: "text-ink-3",
  none: "text-ink-3",
};

/** The emotional centerpiece: a mono countdown that warms amber → rose. */
export function DeadlineCountdown({
  deadline,
  className,
  size = "md",
}: {
  deadline: string | undefined;
  className?: string;
  size?: "sm" | "md";
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const info = deadlineInfo(deadline, now);
  const cls = URGENCY_CLASS[info.urgency] ?? "text-ink-2";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono tabular-nums",
        size === "sm" ? "text-[12px]" : "text-[13px]",
        cls,
        className,
      )}
    >
      {info.urgency === "none" ? <InfinityIcon size={13} /> : <Clock size={13} className={info.urgency === "imminent" ? "motion-safe:animate-pulse-soft" : ""} />}
      {info.label}
    </span>
  );
}
