import "server-only";
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "./rate-limit";

// Per-IP throttle shared by all /api/ai/* routes. These call paid/quota-limited
// LLM providers on shared keys, so an unthrottled loop from one client can
// exhaust the token budget for everyone (already observed as 429s in prod).
// 20 AI calls per minute per IP is generous for real UI use but caps abuse.
const AI_LIMIT = 20;
const AI_WINDOW_MS = 60_000;

/**
 * Returns a 429 response if the caller is over the AI rate limit, otherwise
 * null (proceed). Usage at the top of a route handler:
 *   const limited = aiRateLimit(req); if (limited) return limited;
 */
export function aiRateLimit(req: Request): NextResponse | null {
  const rl = rateLimit(`ai:${clientIp(req)}`, AI_LIMIT, AI_WINDOW_MS);
  if (rl.ok) return null;
  return NextResponse.json(
    { error: "Too many AI requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
  );
}
