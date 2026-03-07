import { Router, Request, Response } from "express";
import { chatCompletion } from "../services/llm.js";
import {
  PROFILE_EXTRACTION_SYSTEM_PROMPT,
  buildProfileExtractionPrompt,
} from "../prompts/profileExtraction.js";

const router = Router();

/**
 * POST /api/profile/extract
 * Takes extracted document text and returns structured profile fields.
 */
router.post("/extract", async (req: Request, res: Response): Promise<void> => {
  try {
    const body =
      typeof req.body === "string"
        ? (JSON.parse(req.body) as Record<string, unknown>)
        : (req.body as Record<string, unknown> | undefined);
    const text = typeof body?.text === "string" ? body.text : "";

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      res.status(400).json({ error: "Provide 'text' field with at least 20 characters of document content." });
      return;
    }

    const raw = await chatCompletion(
      PROFILE_EXTRACTION_SYSTEM_PROMPT,
      buildProfileExtractionPrompt(text.slice(0, 15000)),
      { temperature: 0.2, maxTokens: 4096 }
    );

    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const profile = {
      name: parsed.name || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
      location: parsed.location || "",
      linkedin_url: parsed.linkedin_url || "",
      website_url: parsed.website_url || "",
      programme: parsed.programme || "",
      university: parsed.university || "",
      degree_year: parsed.degree_year || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experiences: Array.isArray(parsed.experiences)
        ? parsed.experiences.map((e: Record<string, unknown>) => ({
            title: e.title || "",
            company: e.company || "",
            start_date: e.start_date || "",
            end_date: e.end_date || "",
            description: e.description || "",
            outcomes: Array.isArray(e.outcomes) ? e.outcomes : [],
          }))
        : [],
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((p: Record<string, unknown>) => ({
            name: p.name || "",
            description: p.description || "",
            technologies: Array.isArray(p.technologies) ? p.technologies : [],
            outcomes: Array.isArray(p.outcomes) ? p.outcomes : [],
          }))
        : [],
    };

    res.json(profile);
  } catch (err) {
    console.error("Profile extraction failed:", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    res.status(500).json({ error: message });
  }
});

export default router;
