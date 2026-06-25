"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

export function AnimatedNumber({
  value,
  duration = 1.4,
  className,
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  const n = Math.round(display);
  return (
    <span ref={ref} className={className}>
      {format ? format(n) : n.toLocaleString("en-IN")}
    </span>
  );
}
