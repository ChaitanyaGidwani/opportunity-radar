"use client";

// Client-side web-push subscription flow. Registers the service worker, fetches
// the VAPID public key, subscribes, and persists the subscription server-side.

import { auth } from "@/lib/firebase";

/** Authorization header carrying the current Firebase ID token, if signed in. */
async function authHeader(): Promise<Record<string, string>> {
  try {
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Push isn't supported in this browser." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Notification permission was denied." };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const keyRes = await fetch("/api/push/vapid");
  const { publicKey } = await keyRes.json();
  if (!publicKey) return { ok: false, reason: "Server is missing VAPID keys." };

  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription }),
  });
  return { ok: true };
}

export async function sendTestPush(payload: { title: string; body: string; url?: string }): Promise<boolean> {
  const res = await fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}
