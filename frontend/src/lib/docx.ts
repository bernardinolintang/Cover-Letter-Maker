import { Document, Packer, Paragraph, TextRun } from "docx";

export async function downloadCoverLetterDOCX(text: string, filename = "cover-letter.docx") {
  const lines = text.split("\n");

  const children = lines.map(
    (line) =>
      new Paragraph({
        children: line.trim()
          ? [new TextRun({ text: line, font: "Calibri", size: 24 })]
          : [],
        spacing: { after: 120 },
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 900, right: 900 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
