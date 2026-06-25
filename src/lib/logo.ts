// Derive org logos from a deep-link URL + clean initials fallback. Client-safe.

const TWO_LEVEL_TLDS = new Set(["co", "gov", "ac", "org", "net", "edu", "com", "res", "nic"]);

/** Registrable domain from a URL: careers.zerodha.com → zerodha.com, x.gov.in → x.gov.in. */
export function rootDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length <= 2) return host;
    const sld = parts[parts.length - 2];
    const tld = parts[parts.length - 1];
    if (TWO_LEVEL_TLDS.has(sld) && tld.length <= 3) return parts.slice(-3).join(".");
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

/** A reliable logo URL for a registrable domain (DuckDuckGo icon service). */
export function logoForDomain(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

/** Ordered logo candidate URLs (explicit → DuckDuckGo → Google favicon), then initials. */
export function logoCandidates(explicit: string | undefined, sourceUrl: string | undefined): string[] {
  const out: string[] = [];
  if (explicit) out.push(explicit);
  const d = rootDomain(sourceUrl);
  if (d) {
    out.push(logoForDomain(d));
    out.push(`https://www.google.com/s2/favicons?domain=${d}&sz=128`);
  }
  return out;
}

export function initials(name: string | undefined): string {
  if (!name) return "•";
  const words = name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "•";
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

/** Deterministic hue from a string, for varied avatar gradients. */
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
