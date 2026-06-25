"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/types";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const EMPTY_PROFILE: Profile = {
  interests: [],
  skills: [],
  onboarded: false,
};

function stripUndefined(obj: Record<string, any>) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

interface ProfileState {
  profile: Profile;
  hydrated: boolean;
  uid: string | null;
  setProfile: (patch: Partial<Profile>) => Promise<void>;
  completeOnboarding: (p: Partial<Profile>) => Promise<void>;
  reset: () => void;
  _setHydrated: () => void;
  _setProfileData: (profile: Profile, uid: string | null) => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: EMPTY_PROFILE,
      hydrated: false,
      uid: null,
      setProfile: async (patch) => {
        const currentProfile = get().profile;
        const newProfile = { ...currentProfile, ...patch };
        set({ profile: newProfile });
        
        const uid = get().uid;
        if (uid) {
          try {
             await setDoc(doc(db, "users", uid), stripUndefined(newProfile), { merge: true });
          } catch (err) {
             console.error("Failed to sync profile to Firestore", err);
          }
        }
      },
      completeOnboarding: async (p) => {
        const currentProfile = get().profile;
        const newProfile = { ...currentProfile, ...p, onboarded: true, createdAt: currentProfile.createdAt ?? new Date().toISOString() };
        set({ profile: newProfile });
        
        const uid = get().uid;
        if (uid) {
          try {
             await setDoc(doc(db, "users", uid), stripUndefined(newProfile), { merge: true });
          } catch (err) {
             console.error("Failed to sync profile to Firestore", err);
          }
        }
      },
      reset: () => set({ profile: EMPTY_PROFILE, uid: null }),
      _setHydrated: () => set({ hydrated: true }),
      _setProfileData: (profile, uid) => set({ profile, uid }),
    }),
    {
      name: "or-profile",
      partialize: (s) => ({ profile: s.profile }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);

// Listener for auth state changes
if (typeof window !== "undefined") {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Fetch profile from Firestore
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          useProfile.getState()._setProfileData(docSnap.data() as Profile, user.uid);
        } else {
          // If no profile exists yet, save the current local one or empty profile to Firestore
          const localProfile = useProfile.getState().profile;
          const profileToSave = { ...localProfile, email: user.email || undefined };
          await setDoc(docRef, stripUndefined(profileToSave), { merge: true });
          useProfile.getState()._setProfileData(profileToSave, user.uid);
        }
      } catch (err) {
        console.error("Failed to fetch profile from Firestore", err);
      }
    } else {
      useProfile.getState().reset();
    }
  });
}
