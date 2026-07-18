"use client";

import { useEffect, useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  type AuthProvider,
  type AuthError,
} from "firebase/auth";
import { auth, googleProvider, githubProvider, linkedinProvider } from "@/lib/firebase";
import { Button } from "../ui/button";

// Static credentialFromError lives on each provider class — pick the right
// one so we can recover the credential when linking an anonymous session
// collides with an account that already exists.
const credentialFromError = (err: AuthError, providerName: string) => {
  if (providerName === "google") return GoogleAuthProvider.credentialFromError(err);
  if (providerName === "github") return GithubAuthProvider.credentialFromError(err);
  return OAuthProvider.credentialFromError(err); // linkedin (generic OIDC provider)
};

/**
 * Verify the reCAPTCHA token server-side before allowing an auth action. The
 * client-side "is the token non-empty" check is only UX; this closes the loop
 * so the token is actually validated against Google. Returns true to proceed.
 * (The server no-ops when RECAPTCHA_SECRET_KEY isn't configured.)
 */
async function verifyCaptcha(token: string | null): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/verify-captcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

const getAuthErrorMessage = (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
  switch (err.code) {
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password is too weak. Please use a stronger password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method. Try another provider or email sign-in.";
    case "auth/popup-blocked":
      return "Popup was blocked by your browser. Please allow popups and try again.";
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user":
      return "";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please contact support.";
    case "auth/credential-already-in-use":
      return "This account is already linked to another user.";
    default:
      return err.message || "An unexpected error occurred. Please try again.";
  }
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any> /* eslint-disable-line @typescript-eslint/no-explicit-any */(null);
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken && process.env.NODE_ENV !== "development") {
      setError("Please verify that you are not a robot.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      if (process.env.NODE_ENV !== "development" && !(await verifyCaptcha(captchaToken))) {
        setError("Captcha verification failed. Please try again.");
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
      if (isLogin) {
        // Switching into an existing account discards this anonymous
        // session's uid, but the local Zustand stores stay in memory, so the
        // Firestore sync (profile/collections/prefs) merges this session's
        // data into the account being signed into.
        await signInWithEmailAndPassword(auth, email, password);
      } else if (auth.currentUser?.isAnonymous) {
        // Upgrade the anonymous session in place — same uid, so everything
        // already synced to Firestore under it carries over automatically.
        await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password));
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(getAuthErrorMessage(err));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignIn = async (provider: AuthProvider, name: string) => {
    setError("");
    setSocialProvider(name);
    try {
      if (auth.currentUser?.isAnonymous) {
        try {
          // Upgrade the anonymous session in place — same uid.
          await linkWithPopup(auth.currentUser, provider);
        } catch (linkErr: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
          if (linkErr.code === "auth/credential-already-in-use") {
            // That social account is already tied to a different existing
            // user — sign into it instead. The local stores are still in
            // memory, so this session's data merges in via Firestore sync.
            const credential = credentialFromError(linkErr, name);
            if (!credential) throw linkErr;
            await signInWithCredential(auth, credential);
          } else {
            throw linkErr;
          }
        }
      } else {
        await signInWithPopup(auth, provider);
      }
      // onAuthStateChanged handles the rest — new users are auto-created.
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      const msg = getAuthErrorMessage(err);
      if (msg) setError(msg);
    } finally {
      setSocialProvider(null);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }
    if (!captchaToken && process.env.NODE_ENV !== "development") {
      setError("Please verify that you are not a robot.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      if (process.env.NODE_ENV !== "development" && !(await verifyCaptcha(captchaToken))) {
        setError("Captcha verification failed. Please try again.");
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(getAuthErrorMessage(err));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-sm text-ink-3">Loading...</p>
      </div>
    );
  }

  // Anonymous sessions (auto-created for every visitor, see lib/firebase.ts)
  // still need to go through sign-up/sign-in to reach gated screens.
  if (user && !user.isAnonymous) {
    return <>{children}</>;
  }

  if (isForgotPassword) {
    return (
      <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="mb-6 text-xl font-semibold tracking-tight text-ink">
          Reset password
        </h2>
        
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        {resetSent && <p className="mb-4 text-sm text-success">Password reset email sent. Check your inbox.</p>}
        
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-3">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-ink-3"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex justify-center my-4">
            {mounted && process.env.NODE_ENV !== "development" && (
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                onChange={(token) => setCaptchaToken(token)}
              />
            )}
          </div>
          <Button type="submit" disabled={isSubmitting || resetSent} className="w-full justify-center">
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-ink-3">
          <button
            onClick={() => {
              setIsForgotPassword(false);
              setResetSent(false);
              setError("");
              setCaptchaToken(null);
            }}
            className="font-medium text-ink hover:underline"
          >
            Back to sign in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-ink">
        {isLogin ? "Sign in" : "Create an account"}
      </h2>
      
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <div className="space-y-2.5">
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleSocialSignIn(googleProvider, "google")}
          disabled={socialProvider !== null || isSubmitting}
          className="w-full justify-center"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
          </svg>
          {socialProvider === "google" ? "Signing in..." : "Continue with Google"}
        </Button>
        {process.env.NEXT_PUBLIC_ENABLE_LINKEDIN === "true" && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSocialSignIn(linkedinProvider, "linkedin")}
            disabled={socialProvider !== null || isSubmitting}
            className="w-full justify-center"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
            {socialProvider === "linkedin" ? "Signing in..." : "Continue with LinkedIn"}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleSocialSignIn(githubProvider, "github")}
          disabled={socialProvider !== null || isSubmitting}
          className="w-full justify-center"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22 0 1.61-.02 2.9-.02 3.29 0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {socialProvider === "github" ? "Signing in..." : "Continue with GitHub"}
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-ink-3">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-ink-3"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-[12px] font-medium text-ink-3">Password</label>
            {isLogin && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError("");
                  setResetSent(false);
                  setCaptchaToken(null);
                }}
                className="text-[12px] font-medium text-ink hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-ink-3"
            placeholder="••••••••"
          />
        </div>
        <div className="flex justify-center my-4">
          {mounted && process.env.NODE_ENV !== "development" && (
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
              onChange={(token) => setCaptchaToken(token)}
            />
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>
      
      <p className="mt-6 text-center text-sm text-ink-3">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setCaptchaToken(null);
            setError("");
          }}
          className="font-medium text-ink hover:underline"
        >
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
