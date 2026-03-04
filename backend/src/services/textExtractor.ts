/**
 * Extract readable text from uploaded file buffers.
 * Supports PDF (via pdf-parse), DOCX (via mammoth), and plain text.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ text: string; warning?: string }> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  try {
    if (mimeType === "application/pdf" || ext === "pdf") {
      return await extractPdf(buffer);
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx"
    ) {
      return await extractDocx(buffer);
    }

    if (mimeType.startsWith("text/") || ext === "txt" || ext === "md") {
      return { text: buffer.toString("utf-8") };
    }

    return {
      text: "",
      warning: `Unsupported file type: ${mimeType} (.${ext})`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", warning: `Extraction failed: ${message}` };
  }
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; warning?: string }> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  const text = data.text.trim();
  if (!text) {
    return { text: "", warning: "PDF extraction yielded empty text (may be image-based)" };
  }
  return { text };
}

async function extractDocx(buffer: Buffer): Promise<{ text: string; warning?: string }> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  if (!text) {
    return { text: "", warning: "DOCX extraction yielded empty text" };
  }
  return { text };
}
