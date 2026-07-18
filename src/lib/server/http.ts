import "server-only";

/**
 * Same-origin guard for state-changing endpoints. Browsers always send an
 * Origin header on cross-site POSTs, so requiring Origin's host to match the
 * request host blocks cross-site browser abuse (CSRF-style). Non-browser
 * clients that omit Origin are still subject to auth + rate limiting on the
 * routes that use this. Returns true when the request is same-origin (or when
 * no Origin/Referer is present and `allowMissing` is set).
 */
export function isSameOrigin(req: Request, allowMissing = true): boolean {
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const source = origin || referer;
  if (!source) return allowMissing;
  if (!host) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

/**
 * Validate a user/third-party supplied URL for safe use as a link target.
 * Only http(s) absolute URLs or root-relative paths are allowed — blocks
 * javascript:, data:, and other script-y schemes. Returns a safe string or
 * null. Optionally restrict absolute URLs to the app's own origin.
 */
export function safeLinkUrl(input: unknown, opts: { sameOriginHost?: string | null } = {}): string | null {
  if (typeof input !== "string") return null;
  const val = input.trim();
  if (!val) return null;
  // Root-relative path (in-app navigation) is always safe.
  if (val.startsWith("/") && !val.startsWith("//")) return val;
  try {
    const u = new URL(val);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (opts.sameOriginHost && u.host !== opts.sameOriginHost) return null;
    return u.toString();
  } catch {
    return null;
  }
}
