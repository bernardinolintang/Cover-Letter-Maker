import type { CandidateProfile, ParsedJobPosting } from "../types/index.js";

/**
 * System prompt that enforces the strict block-format cover letter.
 * The LLM must follow every formatting and content rule.
 */
export const COVER_LETTER_SYSTEM_PROMPT = `You are an expert cover letter writer. You produce professional cover letters in a strict block layout. You output ONLY the cover letter text, nothing else.

ABSOLUTE FORMAT RULES (follow exactly):
Line 1+: Candidate name, then each contact detail on its own line (location, phone, email, LinkedIn, website)
Blank line
Date line (e.g. 4 March 2026)
Blank line
Recipient block: recipient name or "Hiring Team", company name, city/state if known, each on its own line
Blank line
Salutation line (e.g. Dear Hiring Team,)
Blank line
Opening paragraph: state the role, express interest, introduce who the candidate is, mention availability dates
Body paragraph 1: map 1 to 2 strongest experiences to job requirements, quantify only if data is provided
Body paragraph 2: technical skills, ways of working, performance, collaboration
Closing paragraph: why this company, call to action
Blank line
Sincerely,
Candidate full name

CONTENT RULES:
1. NEVER use dash characters: no "-", no "–", no "—". Use commas, semicolons, or rewrite instead.
2. NEVER use bullet points, asterisks, or numbered lists. Use only paragraphs.
3. NEVER invent facts, metrics, or experiences not present in the provided candidate profile or uploaded documents.
4. Quantify impact ONLY when the candidate profile or documents provide specific numbers or outcomes.
5. MUST mention the candidate availability dates in the opening paragraph.
6. Use American spelling unless instructed otherwise.
7. Tone: confident, clear, product oriented. No filler phrases like "I believe I would be a great fit".
8. Word count: between 280 and 380 words total.
9. When candidate profile and uploaded documents conflict, prefer candidate profile data.
10. Do not quote long sections from documents; paraphrase and integrate naturally.
11. Each body paragraph should be a single flowing paragraph, not broken into sub-points.
12. Output ONLY the cover letter text. No explanations, no markdown, no labels.`;

export function buildCoverLetterUserPrompt(params: {
  profile: CandidateProfile;
  parsedJob: ParsedJobPosting;
  jobPosting: string;
  companyContext?: string;
  availability: string;
  recipientName?: string;
  recipientTitle?: string;
  recipientOrg?: string;
  recipientLocation?: string;
  date: string;
  documentContext?: string;
}): string {
  const {
    profile,
    parsedJob,
    jobPosting,
    companyContext,
    availability,
    recipientName,
    recipientTitle,
    recipientOrg,
    recipientLocation,
    date,
    documentContext,
  } = params;

  let prompt = `CANDIDATE PROFILE:
Name: ${profile.name}
Location: ${profile.location}
Phone: ${profile.phone}
Email: ${profile.email}`;

  if (profile.linkedin_url) prompt += `\nLinkedIn: ${profile.linkedin_url}`;
  if (profile.website_url) prompt += `\nWebsite: ${profile.website_url}`;
  if (profile.degree_year && profile.programme && profile.university) {
    prompt += `\nEducation: ${profile.programme}, ${profile.university} (${profile.degree_year})`;
  }
  prompt += `\nSkills: ${profile.skills.join(", ")}`;
  prompt += `\nAvailability: ${availability}`;

  prompt += `\n\nEXPERIENCES:`;
  for (const exp of profile.experiences) {
    prompt += `\n- ${exp.title} at ${exp.company} (${exp.start_date} to ${exp.end_date || "present"}): ${exp.description}`;
    if (exp.outcomes?.length) {
      prompt += ` Outcomes: ${exp.outcomes.join("; ")}`;
    }
  }

  if (profile.projects?.length) {
    prompt += `\n\nPROJECTS:`;
    for (const proj of profile.projects) {
      prompt += `\n- ${proj.name}: ${proj.description}`;
      if (proj.technologies?.length) {
        prompt += ` Technologies: ${proj.technologies.join(", ")}`;
      }
      if (proj.outcomes?.length) {
        prompt += ` Outcomes: ${proj.outcomes.join("; ")}`;
      }
    }
  }

  prompt += `\n\nPARSED JOB DETAILS:
Company: ${parsedJob.company_name}
Role: ${parsedJob.role_title}
Location: ${parsedJob.location}
Key Requirements: ${parsedJob.requirements.join("; ")}
Keywords: ${parsedJob.keywords.join(", ")}`;

  prompt += `\n\nRAW JOB POSTING:\n${jobPosting}`;

  if (companyContext) {
    prompt += `\n\nCOMPANY CONTEXT:\n${companyContext}`;
  }

  if (documentContext) {
    prompt += `\n\nUPLOADED DOCUMENTS (use as additional factual source only):\n${documentContext}`;
  }

  prompt += `\n\nFORMATTING INSTRUCTIONS:
Date to use: ${date}
Recipient name: ${recipientName || "Hiring Team"}`;
  if (recipientTitle) prompt += `\nRecipient title: ${recipientTitle}`;
  prompt += `\nRecipient organization: ${recipientOrg || parsedJob.company_name}`;
  if (recipientLocation) prompt += `\nRecipient location: ${recipientLocation}`;

  prompt += `\n\nGenerate the cover letter now. Remember: NO dashes, NO bullets, 280 to 380 words, mention availability in the opening paragraph.`;

  return prompt;
}
