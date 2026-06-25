"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "../ui/button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
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

  if (user) {
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
        <Button type="submit" disabled={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>
      
      <p className="mt-6 text-center text-sm text-ink-3">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="font-medium text-ink hover:underline"
        >
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
