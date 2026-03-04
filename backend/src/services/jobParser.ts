import type { ParsedJobPosting } from "../types/index.js";
import { chatCompletion } from "./llm.js";
import {
  JOB_PARSING_SYSTEM_PROMPT,
  buildJobParsingUserPrompt,
} from "../prompts/jobParsing.js";

/**
 * Parse raw job posting text into structured fields using the LLM.
 * Falls back to safe defaults if parsing fails.
 */
export async function parseJobPosting(
  jobPosting: string
): Promise<ParsedJobPosting> {
  try {
    const raw = await chatCompletion(
      JOB_PARSING_SYSTEM_PROMPT,
      buildJobParsingUserPrompt(jobPosting),
      { temperature: 0.2, maxTokens: 1024 }
    );

    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      company_name: parsed.company_name || "Unknown",
      role_title: parsed.role_title || "the position",
      location: parsed.location || "Not specified",
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.slice(0, 8)
        : [],
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.slice(0, 10)
        : [],
    };
  } catch (err) {
    console.error("Job parsing failed, using fallback extraction:", err);
    return fallbackParse(jobPosting);
  }
}

/** Simple regex-based fallback if LLM parsing fails. */
function fallbackParse(text: string): ParsedJobPosting {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let companyName = "Unknown";
  let roleTitle = "the position";

  for (const line of lines.slice(0, 5)) {
    if (line.length < 80 && !roleTitle.includes(line.toLowerCase())) {
      if (roleTitle === "the position") {
        roleTitle = line;
      } else if (companyName === "Unknown") {
        companyName = line;
      }
    }
  }

  return {
    company_name: companyName,
    role_title: roleTitle,
    location: "Not specified",
    requirements: [],
    keywords: [],
  };
}
