import html2pdf from "html2pdf.js";

export function downloadCoverLetterPDF(text: string, filename = "cover-letter.pdf") {
  const normalizedText = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n{2,}Sincerely,/g, "\n\nSincerely,");

  const container = document.createElement("div");
  container.style.cssText =
    "width:650px;padding:26px 56px 20px 56px;font-family:'Georgia',serif;color:#1a1a2e;line-height:1.68;font-size:12.4px;";

  const body = document.createElement("div");
  body.style.cssText =
    "white-space:pre-wrap;font-size:12.4px;line-height:1.68;color:#222;";
  body.textContent = normalizedText;

  container.appendChild(body);

  const opt = {
    margin: [0, 0, 0, 0],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "pt", format: "a4", orientation: "portrait" as const },
  };

  html2pdf().set(opt).from(container).save();
}
