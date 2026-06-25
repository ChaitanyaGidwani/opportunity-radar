import { NextResponse } from "next/server";
import { broadcast, type PushPayload } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Fire a web-push notification to all subscribed devices. Used by the
 * notification center's "Send a test nudge" action to prove the channel works
 * locally; in production the cron-driven /api/nudges worker would call this.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const payload: PushPayload = {
    title: body.title ?? "⏰ Deadline approaching",
    body: body.body ?? "An opportunity you're tracking is closing soon.",
    url: body.url ?? "/notifications",
    tag: body.tag,
  };
  const result = await broadcast(payload);
  return NextResponse.json({ ok: true, ...result });
}
