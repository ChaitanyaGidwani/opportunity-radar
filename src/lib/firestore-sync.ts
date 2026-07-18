"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import type { StoreApi, UseBoundStore } from "zustand";
import { auth, db } from "@/lib/firebase";

/**
 * Wires an already-localStorage-persisted Zustand store to a per-user
 * Firestore document at users/{uid}/private/{docName}.
 *
 * Every visitor gets a uid via Firebase Auth (anonymous by default, see
 * lib/firebase.ts), so this runs for everyone — not just people who created
 * an account. On every sign-in transition (anonymous session started,
 * anonymous upgraded to a real account, or signed into a different existing
 * account) the remote copy is merged into local state via `mergeRemote` so
 * data collected before this session isn't lost, then local edits are pushed
 * back to Firestore (debounced).
 */
export function bindStoreToFirestore<T extends { hydrated: boolean }>(
  store: UseBoundStore<StoreApi<T>>,
  docName: string,
  pick: (state: T) => Record<string, unknown>,
  mergeRemote: (local: T, remote: Record<string, unknown>) => Partial<T>,
) {
  if (typeof window === "undefined") return;

  let stopWatching: (() => void) | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const waitForHydration = () =>
    new Promise<void>((resolve) => {
      if (store.getState().hydrated) {
        resolve();
        return;
      }
      const unsub = store.subscribe((s) => {
        if (s.hydrated) {
          unsub();
          resolve();
        }
      });
    });

  const push = (uid: string) => {
    setDoc(doc(db, "users", uid, "private", docName), pick(store.getState()), { merge: true }).catch((err) => {
      console.error(`Failed to sync ${docName} to Firestore`, err);
    });
  };

  auth.onAuthStateChanged(async (user) => {
    // Stop pushing on behalf of whichever uid we were previously watching.
    stopWatching?.();
    stopWatching = null;
    if (debounceTimer) clearTimeout(debounceTimer);

    const uid = user?.uid ?? null;
    if (!uid) return;

    // Local state may still be mid-hydration from localStorage; wait so we
    // don't clobber it (or Firestore) with a half-loaded snapshot.
    await waitForHydration();

    try {
      const snap = await getDoc(doc(db, "users", uid, "private", docName));
      if (snap.exists()) {
        store.setState((s) => mergeRemote(s, snap.data() as Record<string, unknown>) as Partial<T>);
      }
    } catch (err) {
      console.error(`Failed to fetch ${docName} from Firestore`, err);
    }

    // Reconcile the (possibly merged) state back up immediately, then keep
    // pushing local edits as they happen.
    push(uid);
    stopWatching = store.subscribe(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => push(uid), 800);
    });
  });
}
