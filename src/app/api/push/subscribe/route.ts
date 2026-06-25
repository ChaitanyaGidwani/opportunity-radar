import { NextResponse } from "next/server";
import { removeSubscription, saveSubscription } from "@/lib/push";
import type { PushSubscription } from "web-push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sub = body?.subscription as PushSubscription | undefined;
  if (!sub?.endpoint) {
    return NextResponse.json({ ok: false, error: "Missing subscription" }, { status: 400 });
  }
  await saveSubscription(sub);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  if (endpoint) await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
