import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/groq";
import { resumeAnalysisPrompt } from "@/lib/ai/prompts";
import { peekCorpus } from "@/lib/store";
import { seedAdapter } from "@/lib/sources/seed";
import type { ResumeAnalysis } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    const opportunityId = formData.get("opportunityId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Resume file required" }, { status: 400 });
    }

    // Extract text from file
    const buffer = await file.arrayBuffer();
    const text = await extractTextFromFile(buffer, file.type, file.name);

    if (!text || text.trim().length < 30) {
      return NextResponse.json({ error: "Could not extract readable text from this document. Please ensure it is a text-selectable PDF or TXT file." }, { status: 400 });
    }

    // On Vercel serverless, peek disk cache first. If cold boot, use seed fallback instead of blocking on live scrapes!
    const cached = await peekCorpus();
    const opportunities = (cached && cached.opportunities.length > 0)
      ? cached.opportunities
      : await seedAdapter.fetch();

    const opp = opportunityId
      ? opportunities.find((o) => o.id === opportunityId) || opportunities[0]
      : opportunities[0];
    if (!opp) {
      return NextResponse.json({ error: "No opportunities available for analysis" }, { status: 404 });
    }

    const { system, user } = resumeAnalysisPrompt(text, opp);
    const analysis = await generateJSON<ResumeAnalysis>(system, user);

    // Clamp score to 0-100
    analysis.matchScore = Math.max(0, Math.min(100, Math.round(analysis.matchScore)));

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    console.error("[AI Resume]", err);
    let msg = "Failed to analyze resume";
    if (err instanceof Error) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error && parsed.error.message) {
          msg = parsed.error.message;
        } else {
          msg = err.message;
        }
      } catch {
        msg = err.message;
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Extracts text from a file. Uses pdf-parse for compressed PDFs,
 * with pure JS fallback.
 */
async function extractTextFromFile(
  buffer: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  // Plain text files
  if (mimeType === "text/plain" || fileName.endsWith(".txt")) {
    return new TextDecoder().decode(buffer);
  }

  // PDF: use pdf-parse to uncompress FlateDecode streams
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    try {
 
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: Buffer.from(buffer) });
      const data = await parser.getText();
      await parser.destroy();
      if (data && data.text && data.text.trim().length >= 30) {
        return data.text.trim();
      }
    } catch (e) {
      console.warn("[PDF Parse Error]", e);
    }
    const bytes = new Uint8Array(buffer);
    return extractTextFromPDFBytes(bytes);
  }

  // Fallback: try to decode as text
  return new TextDecoder().decode(buffer);
}

/** Extract readable text runs from raw PDF bytes (fallback). */
function extractTextFromPDFBytes(bytes: Uint8Array): string {
  const text: string[] = [];
  const str = new TextDecoder("latin1").decode(bytes);

  const parenRegex = /\(([^)]{2,})\)/g;
  let m: RegExpExecArray | null;
  while ((m = parenRegex.exec(str)) !== null) {
    const s = m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\\\/g, "\\")
      .replace(/\\([()])/g, "$1");
    if (/[a-zA-Z]/.test(s) && s.length > 1) {
      text.push(s);
    }
  }

  return text.join(" ").replace(/\s+/g, " ").trim();
}
