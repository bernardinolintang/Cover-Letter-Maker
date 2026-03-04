import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  insertDocument,
  getDocumentById,
  listDocuments,
} from "../db/documents.js";
import { extractText } from "../services/textExtractor.js";
import type { DocumentType, DocumentUploadResponse } from "../types/index.js";

const router = Router();

const VALID_DOC_TYPES = new Set(["resume", "transcript", "portfolio", "other"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// POST /api/documents/upload
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const docType = (req.body.document_type as string) || "other";
      if (!VALID_DOC_TYPES.has(docType)) {
        res
          .status(400)
          .json({ error: `Invalid document_type. Must be one of: ${[...VALID_DOC_TYPES].join(", ")}` });
        return;
      }

      const { text, warning } = await extractText(file.path, file.mimetype);

      if (warning) {
        console.warn(`Document extraction warning for ${file.originalname}: ${warning}`);
      }

      const id = path.basename(file.filename, path.extname(file.filename));

      const doc = {
        id,
        filename: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        document_type: docType as DocumentType,
        storage_path: file.path,
        extracted_text: text,
        created_at: new Date().toISOString(),
      };

      insertDocument(doc);

      const response: DocumentUploadResponse = {
        document_id: id,
        filename: file.originalname,
        document_type: docType as DocumentType,
        extracted_text_preview: text.slice(0, 400),
      };

      res.status(201).json(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json({ error: message });
    }
  }
);

// GET /api/documents
router.get("/", (_req: Request, res: Response) => {
  try {
    const docs = listDocuments();
    const result = docs.map(({ extracted_text, storage_path, ...meta }) => ({
      ...meta,
      extracted_text_preview: extracted_text.slice(0, 400),
    }));
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list documents";
    res.status(500).json({ error: message });
  }
});

// GET /api/documents/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const documentId = Array.isArray(idParam) ? idParam[0] : idParam;
    const doc = getDocumentById(documentId);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get document";
    res.status(500).json({ error: message });
  }
});

export default router;
