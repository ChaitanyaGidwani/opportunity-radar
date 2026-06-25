"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CollectionsState {
  saved: string[];
  applied: string[];
  hydrated: boolean;
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  setApplied: (id: string, value: boolean) => void;
  isApplied: (id: string) => boolean;
  _setHydrated: () => void;
}

export const useCollections = create<CollectionsState>()(
  persist(
    (set, get) => ({
      saved: [],
      applied: [],
      hydrated: false,
      toggleSaved: (id) =>
        set((s) => ({
          saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [id, ...s.saved],
        })),
      isSaved: (id) => get().saved.includes(id),
      setApplied: (id, value) =>
        set((s) => ({
          applied: value ? [...new Set([id, ...s.applied])] : s.applied.filter((x) => x !== id),
        })),
      isApplied: (id) => get().applied.includes(id),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "or-collections",
      partialize: (s) => ({ saved: s.saved, applied: s.applied }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);
