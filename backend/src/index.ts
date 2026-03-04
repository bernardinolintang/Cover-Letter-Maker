import "dotenv/config";
import express from "express";
import cors from "cors";
import { getDb } from "./db/index.js";
import documentsRouter from "./routes/documents.js";
import coverLetterRouter from "./routes/coverLetter.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Initialize database on startup
getDb();

app.use("/api/documents", documentsRouter);
app.use("/api/cover-letter", coverLetterRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`CoverCraft backend running on http://localhost:${PORT}`);
});

export { app };
