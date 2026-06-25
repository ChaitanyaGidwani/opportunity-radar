import { Briefcase, GraduationCap, Trophy, Code2, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  internship: Briefcase,
  scholarship: GraduationCap,
  competition: Trophy,
  hackathon: Code2,
};

export const CATEGORY_COLOR: Record<Category, string> = {
  internship: "var(--color-cat-internship)",
  scholarship: "var(--color-cat-scholarship)",
  competition: "var(--color-cat-competition)",
  hackathon: "var(--color-cat-hackathon)",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  internship: "Internship",
  scholarship: "Scholarship",
  competition: "Competition",
  hackathon: "Hackathon",
};

/** Always icon + label together — never colour alone (WCAG). */
export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORY_ICON[category];
  const color = CATEGORY_COLOR[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}
    >
      <Icon size={12} strokeWidth={2.4} />
      {CATEGORY_LABEL[category]}
    </span>
  );
}
