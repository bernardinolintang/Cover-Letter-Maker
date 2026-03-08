import { Router, Request, Response } from "express";
import { parseJobPosting } from "../services/jobParser.js";
import { chatCompletion } from "../services/llm.js";

const router = Router();

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// POST /api/job/fetch
router.post("/fetch", async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      res.status(400).json({ error: "Only HTTP/HTTPS URLs are supported" });
      return;
    }

    const resp = await fetch(parsedUrl.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; CoverCraftBot/1.0; +https://covercraft.app)",
      },
    });

    if (!resp.ok) {
      res.status(400).json({ error: `Unable to fetch URL (${resp.status})` });
      return;
    }

    const html = await resp.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() || parsedUrl.hostname;
    const text = stripHtml(html).slice(0, 30000);

    if (text.length < 80) {
      res.status(400).json({ error: "Could not extract enough job text from this page" });
      return;
    }

    res.json({
      url: parsedUrl.toString(),
      title,
      text,
      preview: text.slice(0, 500),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch job URL";
    res.status(500).json({ error: message });
  }
});

// POST /api/job/parse
router.post("/parse", async (req: Request, res: Response): Promise<void> => {
  try {
    const { job_posting } = req.body as { job_posting?: string };
    if (!job_posting || typeof job_posting !== "string") {
      res.status(400).json({ error: "job_posting is required" });
      return;
    }
    const parsed = await parseJobPosting(job_posting);
    res.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse job posting";
    res.status(500).json({ error: message });
  }
});

// POST /api/job/research
router.post("/research", async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, company_name } = req.body as { text?: string; company_name?: string };
    if (!text || typeof text !== "string" || text.trim().length < 120) {
      res.status(400).json({ error: "text is required (min 120 chars)" });
      return;
    }

    const systemPrompt = `You extract company context from job page text.
Return strict JSON only with keys:
company_summary (string),
mission (string),
values (array of strings),
recent_news (array of strings).
Rules:
- Use ONLY information present in the provided text.
- If data is not present, return empty string or empty arrays.
- No markdown fences.`;

    const userPrompt = `Company (if known): ${company_name || "Unknown"}\n\nJob/company page text:\n${text.slice(0, 18000)}`;

    const raw = await chatCompletion(systemPrompt, userPrompt, {
      temperature: 0.2,
      maxTokens: 900,
    });

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json({
      company_summary: typeof parsed.company_summary === "string" ? parsed.company_summary : "",
      mission: typeof parsed.mission === "string" ? parsed.mission : "",
      values: Array.isArray(parsed.values) ? parsed.values.slice(0, 6) : [],
      recent_news: Array.isArray(parsed.recent_news) ? parsed.recent_news.slice(0, 5) : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to research company context";
    res.status(500).json({ error: message });
  }
});

export default router;
