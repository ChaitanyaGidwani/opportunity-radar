import "server-only";
import Groq from "groq-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Groq client. Server-side only — the API key never reaches the
// client bundle because we import "server-only" at the top.
// ─────────────────────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";
const MAX_RETRIES = 3;

/** Sleep helper for exponential backoff. */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry wrapper with exponential backoff for rate-limit errors. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || err?.error?.code === "rate_limit_exceeded";
      if (!isRateLimit || attempt === MAX_RETRIES - 1) throw err;
      const backoff = Math.pow(2, attempt + 1) * 1000 + Math.random() * 500;
      console.warn(`[Groq] Rate limited, retrying in ${Math.round(backoff)}ms…`);
      await sleep(backoff);
    }
  }
  throw new Error("Unreachable");
}

/**
 * Generate a structured JSON response. The `jsonSchema` description guides
 * the LLM to produce valid JSON. We parse and return the result.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  return withRetry(async () => {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2048,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as T;
  });
}

/** Generate plain text. */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  return withRetry(async () => {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  });
}

/** Generate a streaming response (for typewriter effects). */
export async function generateStream(
  systemPrompt: string,
  userPrompt: string,
) {
  return groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 1024,
    stream: true,
  });
}
