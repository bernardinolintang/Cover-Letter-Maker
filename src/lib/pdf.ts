import html2pdf from "html2pdf.js";

export function downloadCoverLetterPDF(text: string, filename = "cover-letter.pdf") {
  const container = document.createElement("div");
  container.style.cssText =
    "width:650px;padding:60px 50px;font-family:'Georgia',serif;color:#1a1a2e;line-height:1.85;font-size:13px;";

  // Letterhead
  const header = document.createElement("div");
  header.style.cssText =
    "border-bottom:2px solid #c8a455;padding-bottom:18px;margin-bottom:32px;";
  header.innerHTML = `
    <div style="font-family:'Georgia',serif;font-size:22px;font-weight:700;color:#1a1a2e;letter-spacing:0.5px;">Cover Letter</div>
    <div style="font-size:11px;color:#6b7280;margin-top:4px;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  `;

  // Body
  const body = document.createElement("div");
  body.style.cssText = "white-space:pre-wrap;font-size:13px;line-height:1.85;color:#222;";
  body.textContent = text;

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText =
    "margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center;";
  footer.textContent = "Generated with CoverCraft";

  container.appendChild(header);
  container.appendChild(body);
  container.appendChild(footer);

  const opt = {
    margin: 0,
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "pt", format: "a4", orientation: "portrait" as const },
  };

  html2pdf().set(opt).from(container).save();
}
