"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NudgeChannel } from "@/lib/types";

export interface NudgePrefs {
  channels: Record<"in-app" | "push" | "email", boolean>;
  primaryChannel: NudgeChannel;
  quietStart: number; // hour IST, inclusive
  quietEnd: number; // hour IST
  frequencyCap: number; // max nudges/day
  weeklyDigest: boolean;
}

interface PrefsState extends NudgePrefs {
  readIds: string[];
  snoozed: Record<string, string>; // nudgeId -> until ISO
  mutedOpportunities: string[];
  hydrated: boolean;
  setChannel: (c: "in-app" | "push" | "email", on: boolean) => void;
  setPref: <K extends keyof NudgePrefs>(key: K, value: NudgePrefs[K]) => void;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  snooze: (id: string, untilISO: string) => void;
  muteOpportunity: (id: string) => void;
  isRead: (id: string) => boolean;
  _setHydrated: () => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      channels: { "in-app": true, push: false, email: false },
      primaryChannel: "in-app",
      quietStart: 21, // 9pm
      quietEnd: 8, // 8am
      frequencyCap: 4,
      weeklyDigest: true,
      readIds: [],
      snoozed: {},
      mutedOpportunities: [],
      hydrated: false,
      setChannel: (c, on) => set((s) => ({ channels: { ...s.channels, [c]: on } })),
      setPref: (key, value) => set({ [key]: value } as Partial<PrefsState>),
      markRead: (id) => set((s) => ({ readIds: [...new Set([id, ...s.readIds])] })),
      markAllRead: (ids) => set((s) => ({ readIds: [...new Set([...ids, ...s.readIds])] })),
      snooze: (id, untilISO) => set((s) => ({ snoozed: { ...s.snoozed, [id]: untilISO } })),
      muteOpportunity: (id) =>
        set((s) => ({ mutedOpportunities: [...new Set([id, ...s.mutedOpportunities])] })),
      isRead: (id) => get().readIds.includes(id),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "or-prefs",
      partialize: (s) => ({
        channels: s.channels,
        primaryChannel: s.primaryChannel,
        quietStart: s.quietStart,
        quietEnd: s.quietEnd,
        frequencyCap: s.frequencyCap,
        weeklyDigest: s.weeklyDigest,
        readIds: s.readIds.slice(0, 200),
        snoozed: s.snoozed,
        mutedOpportunities: s.mutedOpportunities,
      }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);
