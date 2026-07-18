import { NextResponse } from "next/server";
import { broadcast, type PushPayload } from "@/lib/push";
import { verifyRequest } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { isSameOrigin, safeLinkUrl } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const MAX_TEXT = 200;

/**
 * Fire a web-push notification to subscribed devices. Used by the notification
 * center's "Send a test nudge" action. Locked down so it can't be driven by an
 * unauthenticated script (which would let anyone broadcast an arbitrary
 * title/body/link — a phishing vector — to every subscriber):
 *   - must be same-origin
 *   - caller must present a valid Firebase ID token (anonymous is fine)
 *   - rate limited per user
 *   - payload text is length-capped and the click-through URL is restricted to
 *     an in-app path / same-origin http(s) URL (no javascript:, data:, etc.)
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const user = await verifyRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`push-send:${user.uid}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const clip = (v: unknown, fallback: string) =>
    (typeof v === "string" && v.trim() ? v.trim() : fallback).slice(0, MAX_TEXT);

  const host = req.headers.get("host");
  const payload: PushPayload = {
    title: clip(body.title, "⏰ Deadline approaching"),
    body: clip(body.body, "An opportunity you're tracking is closing soon."),
    url: safeLinkUrl(body.url, { sameOriginHost: host }) ?? "/notifications",
    tag: typeof body.tag === "string" ? body.tag.slice(0, MAX_TEXT) : undefined,
  };

  const result = await broadcast(payload);
  return NextResponse.json({ ok: true, ...result });
}
