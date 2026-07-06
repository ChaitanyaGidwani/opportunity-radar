import "server-only";
import Groq from "groq-sdk";

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
async function createCompletion(params: any): Promise<any> {
  try {
    return await groq.chat.completions.create({ ...params, model: PRIMARY_MODEL });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    const isRateLimit = err?.status === 429 || err?.error?.code === "rate_limit_exceeded" || err?.message?.includes("429") || err?.message?.includes("Rate limit");
    if (isRateLimit) {
      console.warn(`[Groq] Primary model rate limit (429). Auto-switching to fallback model (${FALLBACK_MODEL})…`);
      return await groq.chat.completions.create({ ...params, model: FALLBACK_MODEL });
    }
    throw err;
  }
}

/** Generate a structured JSON response. */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const completion = await createCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 2048,
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

/** Generate plain text. */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
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
