import "dotenv/config";
import express from "express";
import cors from "cors";
import documentsRouter from "./routes/documents.js";
import coverLetterRouter from "./routes/coverLetter.js";
import profileRouter from "./routes/profile.js";
import { COVER_LETTER_SYSTEM_PROMPT } from "./prompts/coverLetter.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api/documents", documentsRouter);
app.use("/api/cover-letter", coverLetterRouter);
app.use("/api/profile", profileRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/default-prompt", (_req, res) => {
  res.json({ system_prompt: COVER_LETTER_SYSTEM_PROMPT });
});

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
