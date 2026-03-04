import { describe, it, expect, vi, beforeEach } from "vitest";
import { containsDash, containsBullets } from "../src/validators/coverLetter.js";

/**
 * These tests verify the cover letter generation pipeline rules
 * without calling the actual LLM. The LLM service is mocked.
 */

// Mock the LLM module before importing the generator
vi.mock("../src/services/llm.js", () => ({
  chatCompletion: vi.fn(),
}));

// Mock the DB module
vi.mock("../src/db/documents.js", () => ({
  getDocumentsByIds: vi.fn().mockReturnValue([]),
}));

import { chatCompletion } from "../src/services/llm.js";
import { generateCoverLetter } from "../src/services/coverLetterGenerator.js";
import type { CoverLetterRequest } from "../src/types/index.js";

const mockedChat = vi.mocked(chatCompletion);

const SAMPLE_PROFILE = {
  name: "Jane Doe",
  location: "Toronto, Ontario",
  phone: "(416) 555 0199",
  email: "jane@example.com",
  linkedin_url: "https://linkedin.com/in/janedoe",
  skills: ["Python", "React", "SQL", "Product Management"],
  experiences: [
    {
      title: "Product Intern",
      company: "TechStart Inc.",
      start_date: "May 2024",
      end_date: "August 2024",
      description: "Led onboarding redesign for B2B SaaS platform.",
      outcomes: ["Reduced drop off by 22%"],
    },
  ],
  availability_default: "1 May 2026",
};

const SAMPLE_JOB = `Product Manager at Acme Corp
Toronto, ON
Requirements: 2+ years product experience, SQL proficiency, agile methodology.
We are looking for someone passionate about fintech.`;

const MOCK_PARSED_JOB_RESPONSE = JSON.stringify({
  company_name: "Acme Corp",
  role_title: "Product Manager",
  location: "Toronto, ON",
  requirements: ["2+ years product experience", "SQL proficiency", "agile methodology"],
  keywords: ["product", "SQL", "agile", "fintech"],
});

const MOCK_COVER_LETTER = `Jane Doe
Toronto, Ontario
(416) 555 0199
jane@example.com
linkedin.com/in/janedoe

4 March 2026

Hiring Team
Acme Corp
Toronto, ON

Dear Hiring Team,

I am writing to express my interest in the Product Manager role at Acme Corp. As a product focused professional with hands on experience in SaaS platforms, I am available to start from 1 May 2026. My background combines technical proficiency with a passion for building user centered products that drive measurable outcomes.

During my internship at TechStart Inc., I led a cross functional team to redesign the B2B onboarding flow, resulting in a 22% reduction in drop off rates. I collaborated closely with engineering and design to prioritize features based on user research, delivering the project ahead of schedule. This experience honed my ability to translate complex requirements into clear, actionable product roadmaps that align with business objectives.

I bring strong skills in Python, React, SQL, and agile methodologies. I thrive in collaborative, data informed environments where iteration and user feedback guide product decisions. My analytical mindset enables me to identify opportunities, define success metrics, and communicate effectively across technical and non technical stakeholders.

Acme Corp's mission to democratize financial tools resonates deeply with my values. I would welcome the opportunity to discuss how my experience in product management and technical execution can contribute to your team's ambitious goals. Please feel free to reach out at your earliest convenience.

Sincerely,
Jane Doe`;

function makeRequest(overrides?: Partial<CoverLetterRequest>): CoverLetterRequest {
  return {
    candidate_profile: SAMPLE_PROFILE,
    job_posting: SAMPLE_JOB,
    ...overrides,
  };
}

describe("Cover Letter Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a cover letter without dashes", async () => {
    mockedChat
      .mockResolvedValueOnce(MOCK_PARSED_JOB_RESPONSE)
      .mockResolvedValueOnce(MOCK_COVER_LETTER);

    const result = await generateCoverLetter(makeRequest());

    expect(result.cover_letter_text).toBeTruthy();
    expect(containsDash(result.cover_letter_text)).toBe(false);
    expect(result.quality_checks.no_dashes).toBe(true);
  });

  it("generates a cover letter without bullets", async () => {
    mockedChat
      .mockResolvedValueOnce(MOCK_PARSED_JOB_RESPONSE)
      .mockResolvedValueOnce(MOCK_COVER_LETTER);

    const result = await generateCoverLetter(makeRequest());

    expect(containsBullets(result.cover_letter_text)).toBe(false);
    expect(result.quality_checks.no_bullets).toBe(true);
  });

  it("mentions availability in the output", async () => {
    mockedChat
      .mockResolvedValueOnce(MOCK_PARSED_JOB_RESPONSE)
      .mockResolvedValueOnce(MOCK_COVER_LETTER);

    const result = await generateCoverLetter(makeRequest());

    expect(result.quality_checks.availability_mentioned).toBe(true);
  });

  it("returns extracted fields with role and company", async () => {
    mockedChat
      .mockResolvedValueOnce(MOCK_PARSED_JOB_RESPONSE)
      .mockResolvedValueOnce(MOCK_COVER_LETTER);

    const result = await generateCoverLetter(makeRequest());

    expect(result.extracted_fields.role_title).toBe("Product Manager");
    expect(result.extracted_fields.company).toBe("Acme Corp");
    expect(result.extracted_fields.key_requirements.length).toBeGreaterThan(0);
  });

  it("post-processes dashes out even if LLM produces them", async () => {
    const letterWithDashes = MOCK_COVER_LETTER.replace(
      "cross functional",
      "cross-functional"
    );
    mockedChat
      .mockResolvedValueOnce(MOCK_PARSED_JOB_RESPONSE)
      .mockResolvedValueOnce(letterWithDashes);

    const result = await generateCoverLetter(makeRequest());

    expect(containsDash(result.cover_letter_text)).toBe(false);
  });

  it("does not fabricate metrics not present in profile", async () => {
    const profileNoMetrics = {
      ...SAMPLE_PROFILE,
      experiences: [
        {
          title: "Intern",
          company: "SomeCo",
          start_date: "Jan 2024",
          end_date: "Apr 2024",
          description: "Assisted with product development.",
        },
      ],
    };

    const cleanLetter = MOCK_COVER_LETTER.replace(
      "22% reduction in drop off rates",
      "improved onboarding experience"
    );
    mockedChat
      .mockResolvedValueOnce(MOCK_PARSED_JOB_RESPONSE)
      .mockResolvedValueOnce(cleanLetter);

    const result = await generateCoverLetter(
      makeRequest({ candidate_profile: profileNoMetrics })
    );

    expect(result.cover_letter_text).not.toMatch(/\d{2,}%/);
  });

  it("uses document context when document_ids are provided", async () => {
    const { getDocumentsByIds } = await import("../src/db/documents.js");
    const mockedGetDocs = vi.mocked(getDocumentsByIds);
    mockedGetDocs.mockReturnValueOnce([
      {
        id: "doc-1",
        filename: "resume.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        document_type: "resume",
        storage_path: "/uploads/doc-1.pdf",
        extracted_text: "Jane has 3 years experience in product analytics.",
        created_at: "2026-01-01",
      },
    ]);

    mockedChat
      .mockResolvedValueOnce(MOCK_PARSED_JOB_RESPONSE)
      .mockResolvedValueOnce(MOCK_COVER_LETTER);

    const result = await generateCoverLetter(
      makeRequest({ document_ids: ["doc-1"] })
    );

    expect(result.extracted_fields.used_documents).toContain("resume.pdf");
  });
});
