"use client";

import { useState } from "react";
import { Upload, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { useProfile } from "@/store/profile";
import { useToastStore } from "@/store/toast";
import { SKILLS } from "@/lib/taxonomy";
import { buttonVariants } from "../ui/button";
import type { ResumeAnalysis } from "@/lib/types";

export function ResumeProfileTune() {
  const profile = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);
  const pushToast = useToastStore((s) => s.push);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const form = new FormData();
      form.append("resume", file);
      const res = await fetch("/api/ai/resume", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }
      const json = await res.json();
      setAnalysis(json.analysis);
      pushToast("Resume analyzed successfully!", "success");
    } catch (err: any) {
      setError(err.message || "Failed to analyze resume");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToProfile = () => {
    if (!analysis) return;
    const extracted = [...(analysis.extractedSkills || []), ...(analysis.extractedTechnologies || [])];
    const matchedSlugs = SKILLS.filter((s) =>
      extracted.some((x) => s.label.toLowerCase() === x.toLowerCase() || s.slug === x.toLowerCase())
    ).map((s) => s.slug);

    const currentSkills = new Set(profile.skills || []);
    let addedCount = 0;
    for (const slug of matchedSlugs) {
      if (!currentSkills.has(slug)) {
        currentSkills.add(slug);
        addedCount++;
      }
    }

    setProfile({ skills: Array.from(currentSkills) });
    pushToast(addedCount > 0 ? `Added ${addedCount} resume skills to your profile!` : "Your profile already has all these skills!", "success");
  };

  return (
    <div className="panel p-5 mb-6 border border-purple-500/30 bg-gradient-to-br from-purple-500/[0.04] to-signal-500/[0.04] rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-purple-600 mb-1.5">
        <Sparkles size={16} className="text-purple-500 animate-pulse" /> Auto-Tune Preferences with Resume AI
      </div>
      <p className="text-[13px] text-ink-2 mb-3 leading-relaxed">
        Upload your resume (PDF or TXT). Our Groq AI engine will extract your exact skills, technologies, and education to personalize your opportunity feed automatically.
      </p>

      {!analysis ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer inline-block">
            <input type="file" accept=".pdf,.txt" onChange={handleUpload} disabled={loading} className="hidden" />
            <span className={buttonVariants({ variant: "primary", size: "sm" })}>
              <Upload size={14} className={loading ? "animate-bounce" : ""} /> {loading ? "Analyzing resume AI…" : "Upload resume (PDF/TXT)"}
            </span>
          </label>
          <span className="text-[12px] text-ink-3">Never stored or modified · Instant analysis</span>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-purple-500/20 bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 size={14} /> Resume scanned! Extracted {(analysis.extractedSkills?.length || 0) + (analysis.extractedTechnologies?.length || 0)} skills
            </span>
            <button onClick={() => setAnalysis(null)} className="text-xs text-ink-3 hover:text-ink">Upload another</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...(analysis.extractedSkills || []), ...(analysis.extractedTechnologies || [])].slice(0, 15).map((sk, i) => (
              <span key={i} className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-600 border border-purple-500/20">
                {sk}
              </span>
            ))}
          </div>
          <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink-3">Click to tune your feed ranking</span>
            <button
              onClick={handleApplyToProfile}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-purple-500 active:scale-95 transition-all"
            >
              Apply resume skills to feed <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1 text-[12px] text-danger">
          <AlertTriangle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
