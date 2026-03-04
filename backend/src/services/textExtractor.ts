import fs from "fs";
import path from "path";

/**
 * Extract readable text from uploaded files.
 * Supports PDF (via pdf-parse), DOCX (via mammoth), and plain text.
 */
export async function extractText(
  filePath: string,
  mimeType: string
): Promise<{ text: string; warning?: string }> {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (mimeType === "application/pdf" || ext === ".pdf") {
      return await extractPdf(filePath);
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === ".docx"
    ) {
      return await extractDocx(filePath);
    }

    if (mimeType.startsWith("text/") || ext === ".txt" || ext === ".md") {
      const text = fs.readFileSync(filePath, "utf-8");
      return { text };
    }

    return {
      text: "",
      warning: `Unsupported file type: ${mimeType} (${ext})`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", warning: `Extraction failed: ${message}` };
  }
}

async function extractPdf(filePath: string): Promise<{ text: string; warning?: string }> {
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const text = data.text.trim();
  if (!text) {
    return { text: "", warning: "PDF extraction yielded empty text (may be image-based)" };
  }
  return { text };
}

async function extractDocx(filePath: string): Promise<{ text: string; warning?: string }> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value.trim();
  if (!text) {
    return { text: "", warning: "DOCX extraction yielded empty text" };
  }
  return { text };
}
