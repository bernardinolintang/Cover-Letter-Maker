import type {
  CoverLetterRequest,
  CoverLetterResponse,
  ExtractedFields,
  DocumentRecord,
} from "../types/index.js";
import { getDocumentsByIds } from "../db/documents.js";
import { parseJobPosting } from "./jobParser.js";
import { chatCompletion } from "./llm.js";
import {
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterUserPrompt,
} from "../prompts/coverLetter.js";
import { runQualityChecks, containsDash } from "../validators/coverLetter.js";

const MAX_RETRIES = 2;

export async function generateCoverLetter(
  req: CoverLetterRequest
): Promise<CoverLetterResponse> {
  const {
    candidate_profile: profile,
    job_posting: jobPosting,
    company_context: companyContext,
    availability: availOverride,
    recipient_name: recipientName,
    recipient_title: recipientTitle,
    recipient_org: recipientOrg,
    recipient_location: recipientLocation,
    date: dateOverride,
    document_ids: documentIds,
    system_prompt: customSystemPrompt,
  } = req;

  const availability =
    availOverride || profile.availability_default || "immediately";

  const date = dateOverride || formatDateBlock(new Date());

  // 1. Fetch uploaded documents if any
  let documents: DocumentRecord[] = [];
  let documentContext = "";
  if (documentIds?.length) {
    documents = getDocumentsByIds(documentIds);
    documentContext = documents
      .map(
        (doc) =>
          `[Document: ${doc.filename}, type: ${doc.document_type}]\n${doc.extracted_text}`
      )
      .join("\n\n---\n\n");
  }

  // 2. Parse job posting
  const parsedJob = await parseJobPosting(jobPosting);

  // 3. Build prompt and call LLM (with retry for dash violations)
  const userPrompt = buildCoverLetterUserPrompt({
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
    documentContext: documentContext || undefined,
  });

  let coverLetterText = "";
  const systemPrompt = customSystemPrompt || COVER_LETTER_SYSTEM_PROMPT;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const raw = await chatCompletion(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    coverLetterText = postProcess(raw);

    if (!containsDash(coverLetterText)) break;

    if (attempt < MAX_RETRIES) {
      console.warn(
        `Attempt ${attempt + 1}: dashes detected, retrying generation`
      );
    }
  }

  // 4. Build extracted fields
  const extractedFields = buildExtractedFields(
    parsedJob,
    profile,
    recipientName,
    recipientOrg,
    documents
  );

  // 5. Run quality checks
  const qualityChecks = runQualityChecks(coverLetterText, availability);

  return {
    cover_letter_text: coverLetterText,
    extracted_fields: extractedFields,
    quality_checks: qualityChecks,
  };
}

/** Post-process the LLM output to enforce formatting rules. */
function postProcess(text: string): string {
  let result = text.trim();

  // Strip markdown fences if the model wrapped the output
  result = result.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");

  // Replace all dash variants with commas or spaces
  result = result.replace(/\s*[–—]\s*/g, ", ");
  result = result.replace(/-/g, " ");

  // Remove any bullet-like lines (convert to inline text)
  result = result
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (/^[*•]\s/.test(trimmed)) return trimmed.slice(2);
      if (/^\d+\.\s/.test(trimmed)) return trimmed.replace(/^\d+\.\s/, "");
      return line;
    })
    .join("\n");

  // Normalize multiple blank lines to exactly one
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

function buildExtractedFields(
  parsedJob: Awaited<ReturnType<typeof parseJobPosting>>,
  profile: CoverLetterRequest["candidate_profile"],
  recipientName: string | undefined,
  recipientOrg: string | undefined,
  documents: DocumentRecord[]
): ExtractedFields {
  const matchedExperiences = profile.experiences
    .slice(0, 3)
    .map((e) => `${e.title} at ${e.company}`);

  const chosenSkills = profile.skills.filter((skill) =>
    parsedJob.keywords.some(
      (kw) =>
        kw.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(kw.toLowerCase())
    )
  );

  return {
    role_title: parsedJob.role_title,
    company: parsedJob.company_name,
    recipient_line: recipientName || "Hiring Team",
    key_requirements: parsedJob.requirements,
    matched_experiences: matchedExperiences,
    chosen_skills:
      chosenSkills.length > 0 ? chosenSkills : profile.skills.slice(0, 5),
    used_documents: documents.map((d) => d.filename),
  };
}

/** Format date as "4 March 2026" style. */
function formatDateBlock(d: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
