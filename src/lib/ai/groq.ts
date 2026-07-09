import "server-only";
import Groq from "groq-sdk";
import { geminiAvailable, generateGeminiJSON, generateGeminiText } from "./gemini";

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Groq client with automatic Tier-Fallback.
// If llama-3.3-70b (100k TPD free limit) hits 429 rate limit, it automatically
// switches to llama-3.1-8b-instant (500k TPD free limit), making the app
// virtually immune to daily token exhaustion.
// ─────────────────────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRateLimit(err: any): boolean {
  return (
    err?.status === 429 ||
    err?.error?.code === "rate_limit_exceeded" ||
    err?.message?.includes("429") ||
    err?.message?.includes("Rate limit")
  );
}

/**
 * Groq's TPM rate limiter tells you exactly how long to wait
 * (e.g. "Please try again in 40.6s"). Parse that instead of guessing, capped
 * so a single request can never stall a serverless function for too long.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function retryAfterMs(err: any, capMs = 4000): number {
  const msg = err?.message || err?.error?.message || "";
  const match = /try again in ([\d.]+)s/i.exec(msg);
  if (match) return Math.min(Math.ceil(parseFloat(match[1]) * 1000), capMs);
  return Math.min(1500, capMs);
}

/**
 * Primary → fallback model → one backoff-and-retry of the fallback. Only the
 * last attempt's error is thrown; everything else is a warn + retry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createCompletion(params: any): Promise<any> {
  try {
    return await groq.chat.completions.create({ ...params, model: PRIMARY_MODEL });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    if (!isRateLimit(err)) throw err;
    console.warn(`[Groq] Primary model rate limit (429). Auto-switching to fallback model (${FALLBACK_MODEL})…`);
    try {
      return await groq.chat.completions.create({ ...params, model: FALLBACK_MODEL });
    } catch (err2: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      if (!isRateLimit(err2)) throw err2;
      const waitMs = retryAfterMs(err2);
      console.warn(`[Groq] Fallback model also rate limited (429). Retrying in ${waitMs}ms…`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return await groq.chat.completions.create({ ...params, model: FALLBACK_MODEL });
    }
  }
}

async function completeJSONViaGroq<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<T> {
  const completion = await createCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  let raw = completion.choices[0]?.message?.content ?? "{}";

  // Clean markdown formatting if present
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Extract JSON object safely
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end >= start) {
    raw = raw.slice(start, end + 1);
  }

  return JSON.parse(raw) as T;
}

async function completeTextViaGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const completion = await createCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 1024,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Generate a structured JSON response. Tries Groq (primary → fallback model →
 * backoff retry, all inside createCompletion) first since it's fastest; if
 * every Groq attempt is still rate-limited AND a GEMINI_API_KEY is configured,
 * falls through to Gemini as a fully independent quota instead of failing.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<T> {
  try {
    return await completeJSONViaGroq<T>(systemPrompt, userPrompt, maxTokens);
  } catch (err) {
    if (isRateLimit(err) && geminiAvailable()) {
      console.warn("[AI] Groq exhausted (primary + fallback + retry). Falling back to Gemini…");
      try {
        return await generateGeminiJSON<T>(systemPrompt, userPrompt, maxTokens);
      } catch (geminiErr) {
        console.error("[AI] Gemini fallback also failed:", geminiErr);
        throw err; // surface the original Groq error — more familiar/actionable
      }
    }
    throw err;
  }
}

/** Generate plain text. Same Groq → Gemini fallback chain as generateJSON. */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  try {
    return await completeTextViaGroq(systemPrompt, userPrompt);
  } catch (err) {
    if (isRateLimit(err) && geminiAvailable()) {
      console.warn("[AI] Groq exhausted (primary + fallback + retry). Falling back to Gemini…");
      try {
        return await generateGeminiText(systemPrompt, userPrompt);
      } catch (geminiErr) {
        console.error("[AI] Gemini fallback also failed:", geminiErr);
        throw err;
      }
    }
    throw err;
  }
}

/** Generate a streaming response. */
export async function generateStream(
  systemPrompt: string,
  userPrompt: string,
) {
  try {
    return await groq.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1024,
      stream: true,
    });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) { /* eslint-disable-line @typescript-eslint/no-unused-vars */
    return await groq.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1024,
      stream: true,
    });
  }
}
