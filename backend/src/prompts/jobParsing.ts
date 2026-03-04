/**
 * System prompt for parsing a raw job posting into structured fields.
 * The LLM should return JSON only, no prose.
 */
export const JOB_PARSING_SYSTEM_PROMPT = `You are a job posting parser. Given a raw job posting text, extract the following fields and return ONLY valid JSON with no additional commentary.

Required JSON shape:
{
  "company_name": "string (company name, or 'Unknown' if not found)",
  "role_title": "string (job title)",
  "location": "string (city, state, country, or 'Not specified')",
  "requirements": ["array of key requirement strings, max 8"],
  "keywords": ["array of important technical/domain keywords, max 10"]
}

Rules:
1. Return ONLY the JSON object, nothing else.
2. Do not wrap in markdown code fences.
3. If a field cannot be determined from the text, use the default shown above.
4. Keep requirement strings concise (under 15 words each).
5. Extract keywords that are specific skills, tools, frameworks, or domain terms.`;

export function buildJobParsingUserPrompt(jobPosting: string): string {
  return `Parse this job posting:\n\n${jobPosting}`;
}
