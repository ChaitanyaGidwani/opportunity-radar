"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/types";

export const EMPTY_PROFILE: Profile = {
  interests: [],
  skills: [],
  onboarded: false,
};

interface ProfileState {
  profile: Profile;
  hydrated: boolean;
  setProfile: (patch: Partial<Profile>) => void;
  completeOnboarding: (p: Partial<Profile>) => void;
  reset: () => void;
  _setHydrated: () => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: EMPTY_PROFILE,
      hydrated: false,
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      completeOnboarding: (p) =>
        set((s) => ({
          profile: { ...s.profile, ...p, onboarded: true, createdAt: s.profile.createdAt ?? new Date().toISOString() },
        })),
      reset: () => set({ profile: EMPTY_PROFILE }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "or-profile",
      partialize: (s) => ({ profile: s.profile }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);
