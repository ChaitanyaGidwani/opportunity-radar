import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/groq";
import { resumeAnalysisPrompt } from "@/lib/ai/prompts";
import { getCorpus } from "@/lib/corpus";
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
    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId required" }, { status: 400 });
    }

    // Extract text from file
    const buffer = await file.arrayBuffer();
    const text = await extractTextFromFile(buffer, file.type, file.name);

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Could not extract enough text from resume" }, { status: 400 });
    }

    const corpus = await getCorpus();
    const opp = corpus.opportunities.find((o) => o.id === opportunityId);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const { system, user } = resumeAnalysisPrompt(text, opp);
    const analysis = await generateJSON<ResumeAnalysis>(system, user);

    // Clamp score to 0-100
    analysis.matchScore = Math.max(0, Math.min(100, Math.round(analysis.matchScore)));

    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error("[AI Resume]", err);
    return NextResponse.json({ error: "Failed to analyze resume" }, { status: 500 });
  }
}

/**
 * Extracts text from a file. For text/plain files, just decode.
 * For PDFs, we extract a rough text representation (no heavy PDF library needed).
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

  // PDF: attempt to extract text strings from the raw bytes.
  // This is a lightweight approach — extracts readable ASCII runs from the PDF
  // without needing a full PDF parsing library.
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    const bytes = new Uint8Array(buffer);
    return extractTextFromPDFBytes(bytes);
  }

  // Fallback: try to decode as text
  return new TextDecoder().decode(buffer);
}

/** Extract readable text runs from raw PDF bytes (lightweight, no deps). */
function extractTextFromPDFBytes(bytes: Uint8Array): string {
  // Look for text between BT...ET operators and parenthesized strings
  const text: string[] = [];
  const str = new TextDecoder("latin1").decode(bytes);

  // Extract parenthesized strings (PDF text objects)
  const parenRegex = /\(([^)]{2,})\)/g;
  let m: RegExpExecArray | null;
  while ((m = parenRegex.exec(str)) !== null) {
    const s = m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\\\/g, "\\")
      .replace(/\\([()])/g, "$1");
    // Only keep runs that look like real text (have letters)
    if (/[a-zA-Z]/.test(s) && s.length > 1) {
      text.push(s);
    }
  }

  return text.join(" ").replace(/\s+/g, " ").trim();
}

