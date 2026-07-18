import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { isSameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Server-side verification of a reCAPTCHA token against Google's siteverify.
 * The client collects the token before sign-up / sign-in / password reset and
 * calls this; the auth action only proceeds if `{ ok: true }`.
 *
 * Graceful degradation: if RECAPTCHA_SECRET_KEY isn't configured (e.g. local
 * dev, or before you've set it in Vercel), verification is treated as a no-op
 * pass so the app keeps working — matching the existing dev-mode captcha skip.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`captcha:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts" }, { status: 429 });
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    // Not configured — don't block auth.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing captcha token" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    const remoteip = clientIp(req);
    if (remoteip && remoteip !== "unknown") params.set("remoteip", remoteip);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    if (data.success) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: "Captcha verification failed" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Captcha verification error" }, { status: 502 });
  }
}
