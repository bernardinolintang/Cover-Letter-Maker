import { Router, Request, Response } from "express";
import { CoverLetterRequestSchema } from "../types/index.js";
import { generateCoverLetter } from "../services/coverLetterGenerator.js";

const router = Router();

// POST /api/cover-letter
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = CoverLetterRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      console.error("Validation errors:", JSON.stringify(parsed.error.flatten().fieldErrors));
      res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await generateCoverLetter(parsed.data);
    res.json(result);
  } catch (err) {
    console.error("Cover letter generation failed:", err);
    const message =
      err instanceof Error ? err.message : "Generation failed";
    res.status(500).json({ error: message });
  }
});

export default router;
