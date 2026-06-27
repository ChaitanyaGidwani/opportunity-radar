"use client";

import { useState } from "react";
import { FileText, Upload, CheckCircle2, XCircle, TrendingUp, AlertTriangle } from "lucide-react";
import type { ResumeAnalysis } from "@/lib/types";
import { Button, buttonVariants } from "../ui/button";   /* eslint-disable-line @typescript-eslint/no-unused-vars */
import { cn } from "@/lib/utils";

export function ResumeMatch({ opportunityId }: { opportunityId: string }) {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("opportunityId", opportunityId);

      const res = await fetch("/api/ai/resume", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Analysis failed");
      }
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any   /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.message || "Failed to analyze resume");
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <div className="rounded-xl border border-line bg-base/40 p-4">
        <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
          <FileText size={14} className="text-signal-500" /> Resume match
        </p>
        <p className="mb-3 text-[12px] text-ink-3">Upload your resume to see how well you match this opportunity.</p>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <span className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Upload size={14} /> Upload resume (PDF/TXT)
          </span>
        </label>
        {error && (
          <p className="mt-2 flex items-center gap-1 text-[12px] text-danger">
            <AlertTriangle size={12} /> {error}
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-base/40 p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <FileText size={14} className="text-signal-500 animate-pulse" /> Analyzing resume…
        </p>
        <div className="mt-3 flex justify-center">
          <div className="h-20 w-20 animate-pulse rounded-full border-4 border-signal-500/30 grid place-items-center">
            <span className="text-lg font-bold text-ink-3">…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const score = analysis.matchScore;
  const scoreColor = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  const ringColor = score >= 75 ? "border-emerald-500" : score >= 50 ? "border-amber-500" : "border-rose-500";

  return (
    <div className="rounded-xl border border-line bg-base/40 p-4">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink">
        <FileText size={14} className="text-signal-500" /> Resume match
      </p>

      {/* Score circle */}
      <div className="flex items-center gap-4">
        <div className={cn("grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-[5px]", ringColor)}>
          <span className={cn("text-xl font-bold", scoreColor)}>{score}%</span>
        </div>
        <div className="min-w-0">
          <p className={cn("text-[15px] font-semibold", scoreColor)}>
            {score >= 75 ? "Strong match" : score >= 50 ? "Moderate match" : "Weak match"}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-3">Based on your resume analysis</p>
        </div>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
            <CheckCircle2 size={12} /> Strengths
          </p>
          <ul className="space-y-1 pl-4">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-[12px] text-ink-2 list-disc">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing skills */}
      {analysis.missingSkills.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-rose-600">
            <XCircle size={12} /> Missing skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.missingSkills.map((s, i) => (
              <span key={i} className="rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-2 py-0.5 text-[11px] text-rose-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Improvement suggestions */}
      {analysis.improvements.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-amber-600">
            <TrendingUp size={12} /> How to improve
          </p>
          <ul className="space-y-1 pl-4">
            {analysis.improvements.map((s, i) => (
              <li key={i} className="text-[12px] text-ink-2 list-disc">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Re-upload */}
      <label className="mt-3 block cursor-pointer">
        <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" />
        <span className="text-[12px] font-medium text-signal-600 hover:text-signal-700">
          Upload a different resume →
        </span>
      </label>

      <p className="mt-2 text-[10px] text-ink-3">✨ AI analysis · your resume is not stored</p>
    </div>
  );
}
