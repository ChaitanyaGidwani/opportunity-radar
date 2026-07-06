"use client";

import { useState } from "react";
import { Sparkles, Trophy, X } from "lucide-react";
import type { ComparisonResult } from "@/lib/types";
import { useProfile } from "@/store/profile";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export function ComparisonTable({
  opportunityIds,
  open,
  onClose,
}: {
  opportunityIds: string[];
  open: boolean;
  onClose: () => void;
}) {
  const profile = useProfile((s) => s.profile);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityIds, profile }),
      });
      if (!res.ok) throw new Error("Comparison failed");
      const data = await res.json();
      setResult(data.comparison);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on open
  if (open && !result && !loading && !error) {
    runComparison();
  }

  const ROWS = [
    { key: "eligibility", label: "Eligibility" },
    { key: "difficulty", label: "Difficulty" },
    { key: "benefits", label: "Benefits" },
    { key: "learningValue", label: "Learning value" },
    { key: "careerImpact", label: "Career impact" },
    { key: "deadline", label: "Deadline" },
    { key: "recommendation", label: "Recommendation" },
  ] as const;

  return (
    <Modal open={open} onClose={onClose} label="Compare opportunities">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Sparkles size={18} className="text-purple-500" /> AI Comparison
          </h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-elevated">
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <Sparkles size={24} className="mx-auto mb-3 animate-pulse text-purple-500" />
            <p className="text-sm text-ink-2">Analyzing and comparing opportunities…</p>
          </div>
        )}

        {error && (
          <div className="py-12 text-center">
            <p className="mb-3 text-sm text-danger">{error}</p>
            <Button onClick={runComparison} size="sm">Retry</Button>
          </div>
        )}

        {result && (
          <div className="mt-4">
            {/* Best pick banner */}
            {result.bestPickReason && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-signal-500/30 bg-signal-500/[0.06] px-4 py-3">
                <Trophy size={16} className="mt-0.5 shrink-0 text-signal-600" />
                <div>
                  <p className="text-[13px] font-semibold text-signal-600">Best pick for you</p>
                  <p className="text-[12px] text-ink-2">{result.bestPickReason}</p>
                </div>
              </div>
            )}

            {/* Comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3" />
                    {result.rows.map((row) => (
                      <th
                        key={row.opportunityId}
                        className={cn(
                          "min-w-[160px] px-3 py-2 text-left text-[12px] font-semibold text-ink",
                          row.opportunityId === result.bestPick && "text-signal-600",
                        )}
                      >
                        {row.title}
                        {row.opportunityId === result.bestPick && (
                          <Trophy size={11} className="ml-1 inline text-signal-500" />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(({ key, label }) => (
                    <tr key={key} className="border-b border-line/50">
                      <td className="py-2.5 pr-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3 whitespace-nowrap">
                        {label}
                      </td>
                      {result.rows.map((row) => (
                        <td
                          key={row.opportunityId}
                          className={cn("px-3 py-2.5 text-ink-2", key === "recommendation" && "font-medium text-ink")}
                        >
                          {(row as Record<string, unknown>)[key] as React.ReactNode ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[10px] text-ink-3">✨ AI-generated comparison · may not be perfectly accurate</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
