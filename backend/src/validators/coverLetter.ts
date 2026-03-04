/**
 * Cover letter validation utilities.
 * Each function is a pure predicate or returns a structured result.
 */

/** Returns true if the text contains any dash character (hyphen, en-dash, em-dash). */
export function containsDash(text: string): boolean {
  return /[-–—]/.test(text);
}

/** Returns true if any line looks like a bullet point. */
export function containsBullets(text: string): boolean {
  const lines = text.split("\n");
  return lines.some((line) => {
    const trimmed = line.trimStart();
    if (/^[*•]/.test(trimmed)) return true;
    if (/^-\s/.test(trimmed)) return true;
    if (/^\d+\.\s/.test(trimmed)) return true;
    return false;
  });
}

/** Returns the word count of plain text. */
export function wordCount(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Validates the block structure of the cover letter:
 * 1. Header lines (name + contact info)
 * 2. Blank line
 * 3. Date line
 * 4. Blank line
 * 5. Recipient block
 * 6. Blank line
 * 7. Salutation
 * 8. Blank line
 * 9. 3-4 body paragraphs separated by blank lines
 * 10. Blank line
 * 11. Sign-off (Sincerely, + name)
 */
export function validateStructure(text: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split("\n");

  if (lines.length < 15) {
    errors.push("Letter is too short to contain all required blocks");
    return { valid: false, errors };
  }

  const blocks = splitIntoBlocks(text);
  if (blocks.length < 6) {
    errors.push(`Expected at least 6 blocks (header, date, recipient, salutation, body, sign-off), found ${blocks.length}`);
    return { valid: false, errors };
  }

  const headerBlock = blocks[0];
  if (headerBlock.split("\n").length < 2) {
    errors.push("Header block should contain at least name and one contact detail");
  }

  const lastBlock = blocks[blocks.length - 1];
  const lastLines = lastBlock.split("\n").filter((l) => l.trim());
  if (lastLines.length < 2) {
    errors.push("Sign-off block should have 'Sincerely,' and the candidate name");
  }
  if (lastLines.length >= 1 && !lastLines[0].toLowerCase().includes("sincerely")) {
    errors.push("Sign-off should start with 'Sincerely'");
  }

  const salutationBlock = blocks[3];
  if (salutationBlock && !salutationBlock.toLowerCase().startsWith("dear")) {
    errors.push("Salutation should start with 'Dear'");
  }

  const bodyBlocks = blocks.slice(4, blocks.length - 1);
  if (bodyBlocks.length < 3 || bodyBlocks.length > 5) {
    errors.push(`Expected 3 to 5 body paragraphs, found ${bodyBlocks.length}`);
  }

  return { valid: errors.length === 0, errors };
}

/** Checks whether the availability string (or a variant) appears in the text. */
export function availabilityMentioned(text: string, availability: string): boolean {
  if (!availability) return false;
  const lower = text.toLowerCase();
  const avLower = availability.toLowerCase();
  if (lower.includes(avLower)) return true;
  const datePatterns = availability.match(/\d{1,2}\s\w+\s\d{4}|\w+\s\d{4}|\w+\s\d{1,2}/g);
  if (datePatterns) {
    return datePatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
  }
  return false;
}

/** Split text into blocks separated by one or more blank lines. */
function splitIntoBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

/** Run all quality checks and return a summary. */
export function runQualityChecks(
  text: string,
  availability: string
): {
  no_dashes: boolean;
  format_ok: boolean;
  length_ok: boolean;
  availability_mentioned: boolean;
  no_bullets: boolean;
} {
  const wc = wordCount(text);
  const structure = validateStructure(text);

  return {
    no_dashes: !containsDash(text),
    no_bullets: !containsBullets(text),
    format_ok: structure.valid,
    length_ok: wc >= 280 && wc <= 380,
    availability_mentioned: availabilityMentioned(text, availability),
  };
}
