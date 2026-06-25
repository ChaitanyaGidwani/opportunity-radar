"use client";

import { create } from "zustand";
import type { Nudge, NudgeChannel, Opportunity, Profile } from "@/lib/types";

interface NudgesState {
  nudges: Nudge[];
  opportunities: Opportunity[];
  loading: boolean;
  loadedAt: number | null;
  error: string | null;
  load: (profile: Profile, savedIds: string[], channel?: NudgeChannel, force?: boolean) => Promise<void>;
}

export const useNudges = create<NudgesState>((set, get) => ({
  nudges: [],
  opportunities: [],
  loading: false,
  loadedAt: null,
  error: null,
  load: async (profile, savedIds, channel = "in-app", force = false) => {
    const { loadedAt, loading } = get();
    if (loading) return;
    if (!force && loadedAt && Date.now() - loadedAt < 60_000) return;
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/nudges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, savedIds, channel }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({
        nudges: data.nudges ?? [],
        opportunities: data.opportunities ?? [],
        loading: false,
        loadedAt: Date.now(),
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Failed to load nudges" });
    }
  },
}));
