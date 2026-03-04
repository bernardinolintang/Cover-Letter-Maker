import { describe, it, expect } from "vitest";
import {
  containsDash,
  containsBullets,
  wordCount,
  validateStructure,
  availabilityMentioned,
  runQualityChecks,
} from "../src/validators/coverLetter.js";

// ── Sample well-formed cover letter for structure tests ────────────

const VALID_LETTER = `Jane Doe
Toronto, Ontario
(416) 555 0199
jane.doe@email.com
linkedin.com/in/janedoe
janedoe.dev

4 March 2026

Hiring Team
Acme Corp
Toronto, Ontario

Dear Hiring Team,

I am writing to express my interest in the Product Manager role at Acme Corp. As a recent graduate of the University of Toronto with a background in computer science and product management, I am available to start from 1 May 2026. My combination of technical depth and user empathy positions me well to contribute to your product team from day one.

During my internship at TechStart Inc., I led a cross functional team of five engineers to ship a customer onboarding flow that reduced drop off rates by 22%. I collaborated with design and data teams to identify friction points, prioritized features based on user research, and delivered the project two weeks ahead of schedule. This experience taught me how to translate ambiguous requirements into clear, actionable roadmaps.

I bring strong skills in Python, SQL, Figma, and agile methodologies. I thrive in collaborative environments where data informs decisions and iteration is valued over perfection. At university, I contributed to an open source analytics dashboard used by over 500 students, coordinating releases across three time zones and maintaining a 99% uptime record.

Acme Corp's mission to democratize financial tools resonates deeply with my own values. I would welcome the opportunity to discuss how my experience aligns with your team's goals. Please feel free to reach out at your convenience.

Sincerely,
Jane Doe`;

describe("containsDash", () => {
  it("detects hyphen", () => {
    expect(containsDash("well-known")).toBe(true);
  });

  it("detects en-dash", () => {
    expect(containsDash("2020–2023")).toBe(true);
  });

  it("detects em-dash", () => {
    expect(containsDash("this — that")).toBe(true);
  });

  it("returns false when no dashes", () => {
    expect(containsDash("This is clean text with no dashes")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsDash("")).toBe(false);
  });
});

describe("containsBullets", () => {
  it("detects asterisk bullets", () => {
    expect(containsBullets("Some text\n* Item one\n* Item two")).toBe(true);
  });

  it("detects bullet character", () => {
    expect(containsBullets("• First point")).toBe(true);
  });

  it("detects dash bullets", () => {
    expect(containsBullets("Hello\n- Item")).toBe(true);
  });

  it("detects numbered lists", () => {
    expect(containsBullets("1. First\n2. Second")).toBe(true);
  });

  it("returns false for plain paragraphs", () => {
    expect(
      containsBullets("This is paragraph one.\n\nThis is paragraph two.")
    ).toBe(false);
  });
});

describe("wordCount", () => {
  it("counts words correctly", () => {
    expect(wordCount("Hello world this is a test")).toBe(6);
  });

  it("handles multiple spaces", () => {
    expect(wordCount("Hello   world")).toBe(2);
  });

  it("handles newlines", () => {
    expect(wordCount("Hello\nworld\nfoo")).toBe(3);
  });

  it("returns 0 for empty string", () => {
    expect(wordCount("")).toBe(0);
  });

  it("counts valid letter in range", () => {
    const wc = wordCount(VALID_LETTER);
    expect(wc).toBeGreaterThanOrEqual(200);
  });
});

describe("validateStructure", () => {
  it("validates a well-formed letter", () => {
    const result = validateStructure(VALID_LETTER);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a very short text", () => {
    const result = validateStructure("Hello\nWorld");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports missing sincerely", () => {
    const modified = VALID_LETTER.replace("Sincerely,", "Best regards,");
    const result = validateStructure(modified);
    expect(result.errors.some((e) => e.includes("Sincerely"))).toBe(true);
  });
});

describe("availabilityMentioned", () => {
  it("finds exact availability string", () => {
    expect(availabilityMentioned(VALID_LETTER, "1 May 2026")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(
      availabilityMentioned("Available from june 2026", "June 2026")
    ).toBe(true);
  });

  it("returns false when not mentioned", () => {
    expect(availabilityMentioned(VALID_LETTER, "September 2099")).toBe(false);
  });

  it("returns false for empty availability", () => {
    expect(availabilityMentioned(VALID_LETTER, "")).toBe(false);
  });
});

describe("runQualityChecks", () => {
  it("passes all checks on a valid letter", () => {
    const checks = runQualityChecks(VALID_LETTER, "1 May 2026");
    expect(checks.no_dashes).toBe(true);
    expect(checks.no_bullets).toBe(true);
    expect(checks.availability_mentioned).toBe(true);
    expect(checks.format_ok).toBe(true);
  });

  it("detects dashes", () => {
    const bad = VALID_LETTER.replace("cross functional", "cross-functional");
    const checks = runQualityChecks(bad, "1 May 2026");
    expect(checks.no_dashes).toBe(false);
  });
});
