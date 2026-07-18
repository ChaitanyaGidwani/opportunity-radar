import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy_api_key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy_auth_domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy_project_id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy_storage_bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "dummy_sender_id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dummy_app_id",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// OAuth providers for social sign-in
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const githubProvider = new GithubAuthProvider();

// LinkedIn is not a built-in Firebase provider — it's configured as a
// custom OIDC provider in the Firebase console (requires Identity Platform).
// The provider ID below must match the one set in the console.
export const linkedinProvider = new OAuthProvider("oidc.linkedin");
linkedinProvider.addScope("openid");
linkedinProvider.addScope("profile");
linkedinProvider.addScope("email");

// Give every visitor a Firebase Auth session — anonymous by default — so
// their data (profile, saved items, prefs) can sync to Firestore under a uid
// from the moment they land, not just after they create a real account.
// AuthGuard treats `user.isAnonymous` as "signed out" for gated screens, and
// signing up/in later upgrades this same uid in place (see auth-guard.tsx),
// so nothing collected anonymously is lost.
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch((err) => {
        console.error("Anonymous sign-in failed", err);
      });
    }
  });
}
