import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// ─────────────────────────────────────────────────────────────────────────────
// Firebase ID token verification — no Firebase Admin SDK / service account
// required. Firebase ID tokens are RS256 JWTs signed by Google. We verify them
// against Google's public JWKS, checking issuer + audience against the project
// id (which is public, NEXT_PUBLIC_FIREBASE_PROJECT_ID). jose caches the JWKS
// in-process, so this is a cheap check after the first request.
//
// This lets our API routes authenticate the caller (anonymous OR real account —
// every visitor has a token now) so state-changing endpoints can't be driven by
// an unauthenticated script.
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  "";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com"),
);

export interface VerifiedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  raw: JWTPayload;
}

/** Pull a bearer token out of the Authorization header, if present. */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Verify a Firebase ID token. Returns the authenticated user, or null if the
 * token is missing, malformed, expired, or fails signature/claim checks.
 * Fails closed — a null return means "treat as unauthenticated".
 */
export async function verifyFirebaseToken(token: string | null): Promise<VerifiedUser | null> {
  if (!token || !PROJECT_ID) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const uid = (payload.sub || (payload.user_id as string | undefined)) ?? "";
    if (!uid) return null;
    const firebase = (payload.firebase as { sign_in_provider?: string } | undefined) ?? {};
    return {
      uid,
      email: (payload.email as string | undefined) ?? null,
      emailVerified: Boolean(payload.email_verified),
      isAnonymous: firebase.sign_in_provider === "anonymous",
      raw: payload,
    };
  } catch {
    return null;
  }
}

/** Convenience: verify straight from the request's Authorization header. */
export function verifyRequest(req: Request): Promise<VerifiedUser | null> {
  return verifyFirebaseToken(getBearerToken(req));
}
