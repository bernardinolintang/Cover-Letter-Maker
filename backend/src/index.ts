import "dotenv/config";
import express from "express";
import cors from "cors";
import documentsRouter from "./routes/documents.js";
import coverLetterRouter from "./routes/coverLetter.js";
import profileRouter from "./routes/profile.js";
import jobRouter from "./routes/job.js";
import { COVER_LETTER_SYSTEM_PROMPT } from "./prompts/coverLetter.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api/documents", documentsRouter);
app.use("/api/cover-letter", coverLetterRouter);
app.use("/api/profile", profileRouter);
app.use("/api/job", jobRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    vercel: Boolean(process.env.VERCEL),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    groq_configured: Boolean(process.env.GROQ_API_KEY),
    groq_model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  });
});

app.get("/api/default-prompt", (_req, res) => {
  res.json({ system_prompt: COVER_LETTER_SYSTEM_PROMPT });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled Express error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  }
);

if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || "3001", 10);
  const server = app.listen(PORT, () => {
    console.log(`CoverCraft backend running on http://localhost:${PORT}`);
  });

  function shutdown() {
    server.close();
    process.exit(0);
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export default app;
