import "server-only";
import type { Opportunity, Profile } from "@/lib/types";
import { SKILL_LABELS } from "@/lib/taxonomy";

// ─────────────────────────────────────────────────────────────────────────────
// Reusable prompt templates. Each function returns a { system, user } pair.
// All prompts request JSON output where applicable, and include guardrails
// against fabrication / hallucination.
// ─────────────────────────────────────────────────────────────────────────────

function oppContext(o: Opportunity): string {
  const parts = [
    `Title: ${o.title}`,
    o.organization ? `Organization: ${o.organization}` : null,
    `Category: ${o.category}`,
    o.summary ? `Description: ${o.summary}` : null,
    o.tags.length > 0 ? `Tags: ${o.tags.map((t) => SKILL_LABELS[t] ?? t).join(", ")}` : null,
    o.deadline ? `Deadline: ${o.deadline}` : "Deadline: Rolling / not specified",
    o.location ? `Location: ${o.isRemote ? "Remote" : o.location}` : null,
    o.stipendMin != null ? `Stipend: ₹${o.stipendMin}${o.stipendMax ? `–₹${o.stipendMax}` : ""} / ${o.stipendPeriod ?? "month"}` : null,
    o.awardAmount != null ? `Award: ₹${o.awardAmount}` : null,
    o.prizeAmount != null ? `Prize pool: ₹${o.prizeAmount}` : null,
    o.eligibility?.raw ? `Eligibility (raw text): ${o.eligibility.raw}` : null,
    o.eligibility?.years?.length ? `Eligible years: ${o.eligibility.years.join(", ")}` : null,
    o.eligibility?.branches?.length ? `Eligible branches: ${o.eligibility.branches.join(", ")}` : null,
    o.sourceUrl ? `Source URL: ${o.sourceUrl}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

function profileContext(p: Profile): string {
  const parts = [
    p.name ? `Name: ${p.name}` : null,
    p.branch ? `Branch: ${p.branch}` : null,
    p.year ? `Year of study: ${p.year}` : null,
    p.degree ? `Degree: ${p.degree}` : null,
    p.college ? `College: ${p.college}` : null,
    p.skills?.length ? `Skills: ${p.skills.map((s) => SKILL_LABELS[s] ?? s).join(", ")}` : null,
    p.interests?.length ? `Interested in: ${p.interests.join(", ")}` : null,
    p.location ? `Location: ${p.location}` : null,
    p.cgpa != null ? `CGPA: ${p.cgpa}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

// ── Feature 1: AI Summary ──────────────────────────────────────────────────

export function opportunitySummaryPrompt(o: Opportunity) {
  return {
    system: `You are a concise opportunity analyst for Indian students. Given an opportunity, produce a structured JSON summary. Be factual — do NOT invent information not present in the input. If a field cannot be determined, say "Not specified".

Return JSON with these exact fields:
{
  "what": "1-2 sentence description of what this opportunity is about",
  "whoShouldApply": "who is the ideal candidate (1 sentence)",
  "keyEligibility": "key eligibility requirements (1-2 sentences)",
  "skillsRequired": ["skill1", "skill2", ...],
  "benefits": "what the participant gets (1-2 sentences)",
  "importantDeadlines": "deadline info or 'Rolling applications'",
  "estimatedDifficulty": "Beginner" or "Intermediate" or "Advanced"
}`,
    user: oppContext(o),
  };
}

// ── Feature 2: Why This Matches You ─────────────────────────────────────────

export function whyMatchesYouPrompt(o: Opportunity, p: Profile) {
  return {
    system: `You explain why a specific opportunity matches a student's profile. Write 2-3 sentences maximum. Be specific — mention the student's actual skills/interests that align. Do NOT fabricate skills or qualifications the student doesn't have. If the match is weak, honestly say so. Use a friendly, encouraging tone.

Do NOT return JSON — return plain text only.`,
    user: `## Opportunity\n${oppContext(o)}\n\n## Student Profile\n${profileContext(p)}`,
  };
}

// ── Feature 3: Smart Tags ───────────────────────────────────────────────────

export function smartTagsPrompt(o: Opportunity) {
  return {
    system: `You are a tagger for student opportunities. Given an opportunity, return a JSON array of descriptive tags. Choose ONLY from this list:

"Beginner Friendly", "Intermediate", "Advanced", "Remote", "On-site", "Hybrid", "Paid", "Unpaid", "High Prestige", "Resume Builder", "Portfolio Builder", "Team-based", "Solo", "Women-only", "International", "India-only", "Open Source", "Research", "Stipend Provided", "Certificate Provided", "Mentorship Included", "Networking Opportunity", "Fast Application", "Long Application"

Return 3-6 tags that best describe this opportunity. Return JSON: { "tags": ["tag1", "tag2", ...] }
Do NOT invent tags outside the list above.`,
    user: oppContext(o),
  };
}

// ── Feature 4: Query Expansion ──────────────────────────────────────────────

export function queryExpansionPrompt(query: string) {
  return {
    system: `You expand a student's natural-language search query into relevant keywords for finding opportunities. Return a JSON object with an array of 8-15 lowercase search terms including synonyms, related concepts, and the original query words.

Example: "I want remote AI internships" → { "terms": ["remote", "artificial intelligence", "machine learning", "internship", "work from home", "deep learning", "data science", "ai", "ml", "neural network", "python", "research"] }

Return JSON: { "terms": ["term1", "term2", ...] }`,
    user: query,
  };
}

// ── Feature 7: Deadline Intelligence ────────────────────────────────────────

export function deadlineInsightPrompt(o: Opportunity, p: Profile) {
  const now = new Date();
  const deadlineDate = o.deadline ? new Date(o.deadline) : null;
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86_400_000) : null;

  return {
    system: `You provide brief, actionable deadline intelligence for student opportunities. Generate a single insight (1-2 sentences) that helps the student act. Consider:
- How many days are left
- Whether this type of opportunity requires preparation (portfolio, resume, team)
- Whether similar opportunities tend to close early or extend
- Any action the student should take now

Do NOT return JSON — return plain text only. Be specific and action-oriented.`,
    user: `${oppContext(o)}\n\nToday's date: ${now.toISOString().split("T")[0]}\nDays until deadline: ${daysLeft ?? "No deadline / rolling"}\n\n## Student Profile\n${profileContext(p)}`,
  };
}

// ── Feature 8: Weekly Digest ────────────────────────────────────────────────

export function weeklyDigestPrompt(
  opportunities: { title: string; category: string; deadline?: string; matchScore: number }[],
  p: Profile,
) {
  const oppList = opportunities
    .slice(0, 30) // Cap to avoid token overflow
    .map((o, i) => `${i + 1}. [${o.category}] ${o.title} (match: ${Math.round(o.matchScore * 100)}%${o.deadline ? `, deadline: ${o.deadline}` : ""})`)
    .join("\n");

  return {
    system: `You write a brief, personalized weekly opportunity digest for a student. Write a natural-language summary in 3-5 sentences. Mention specific numbers (e.g., "5 new hackathons", "2 internships"). Highlight anything urgent (closing within 3 days). Keep the tone friendly and encouraging.

Also return structured highlights. Return JSON:
{
  "summary": "your natural language summary",
  "highlights": [{"category": "hackathon", "count": 5, "note": "3 match your React skills"}],
  "urgentDeadlines": [{"title": "...", "daysLeft": 2}]
}`,
    user: `## Student Profile\n${profileContext(p)}\n\n## This Week's Opportunities\n${oppList}`,
  };
}

// ── Feature 9: Comparison ───────────────────────────────────────────────────

export function comparisonPrompt(opportunities: Opportunity[], p: Profile) {
  const oppsText = opportunities
    .map((o, i) => `### Opportunity ${i + 1}\n${oppContext(o)}`)
    .join("\n\n");

  return {
    system: `You compare student opportunities side by side. For each opportunity, evaluate these dimensions and return a JSON object.

Return JSON:
{
  "rows": [
    {
      "opportunityId": "id",
      "title": "title",
      "eligibility": "brief eligibility summary",
      "difficulty": "Beginner / Intermediate / Advanced",
      "benefits": "what you get",
      "learningValue": "Low / Medium / High with brief explanation",
      "careerImpact": "Low / Medium / High with brief explanation",
      "deadline": "deadline info",
      "recommendation": "1-2 sentence recommendation"
    }
  ],
  "bestPick": "opportunityId of the best match for this student",
  "bestPickReason": "1 sentence why"
}

Be objective. Do NOT fabricate details not in the input.`,
    user: `## Student Profile\n${profileContext(p)}\n\n${oppsText}`,
  };
}

// ── Feature 6: Resume Analysis ──────────────────────────────────────────────

export function resumeAnalysisPrompt(resumeText: string, o: Opportunity) {
  return {
    system: `You analyze a student's resume against a specific opportunity. Extract skills, technologies, education, and projects from the resume, then compare against the opportunity requirements.

Return JSON:
{
  "matchScore": 0-100,
  "extractedSkills": ["skill1", "skill2"],
  "extractedTechnologies": ["tech1", "tech2"],
  "education": "degree and institution",
  "projects": ["project1", "project2"],
  "missingSkills": ["skill the opportunity wants but resume lacks"],
  "strengths": ["strength1", "strength2"],
  "improvements": ["suggestion1", "suggestion2"]
}

CRITICAL: Keep all array items concise (max 10 words each). Limit every array to maximum 8 items to ensure compact JSON generation.
Be honest about the match score. Do NOT inflate it.`,
    user: `## Opportunity\n${oppContext(o)}\n\n## Resume Content\n${resumeText.slice(0, 3500)}`,
  };
}
