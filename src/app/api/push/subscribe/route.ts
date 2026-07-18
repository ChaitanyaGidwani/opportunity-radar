import { NextResponse } from "next/server";
import { z } from "zod";
import { removeSubscription, saveSubscription } from "@/lib/push";
import type { PushSubscription } from "web-push";
import { isSameOrigin } from "@/lib/server/http";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

// A real web-push subscription: an https endpoint plus the p256dh/auth keys.
const SubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://"),
  expirationTime: z.union([z.number(), z.null()]).optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const rl = rateLimit(`push-sub:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SubscriptionSchema.safeParse(body?.subscription);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid subscription" }, { status: 400 });
  }
  await saveSubscription(parsed.data as PushSubscription);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : undefined;
  if (endpoint) await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
