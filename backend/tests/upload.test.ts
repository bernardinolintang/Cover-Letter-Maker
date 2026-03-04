import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";

const TEST_UPLOAD_DIR = "./test-uploads";

let app: import("express").Express;

beforeAll(async () => {
  process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
  process.env.VERCEL = "1";

  if (!fs.existsSync(TEST_UPLOAD_DIR)) {
    fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
  }

  const mod = await import("../src/index.js");
  app = mod.default;
});

afterAll(() => {
  if (fs.existsSync(TEST_UPLOAD_DIR)) {
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
  }
});

describe("POST /api/documents/upload", () => {
  it("uploads a TXT file and returns document_id and preview", async () => {
    const testFile = path.join(TEST_UPLOAD_DIR, "test-resume.txt");
    fs.writeFileSync(
      testFile,
      "Jane Doe\nSoftware Engineer with 5 years of experience in React and Node.js.\nLed a team of 4 to deliver a real-time analytics dashboard."
    );

    const res = await request(app)
      .post("/api/documents/upload")
      .field("document_type", "resume")
      .attach("file", testFile);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("document_id");
    expect(res.body).toHaveProperty("filename", "test-resume.txt");
    expect(res.body).toHaveProperty("document_type", "resume");
    expect(res.body).toHaveProperty("extracted_text_preview");
    expect(res.body.extracted_text_preview.length).toBeGreaterThan(0);
  });

  it("rejects upload without a file", async () => {
    const res = await request(app)
      .post("/api/documents/upload")
      .field("document_type", "resume");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects invalid document_type", async () => {
    const testFile = path.join(TEST_UPLOAD_DIR, "test2.txt");
    fs.writeFileSync(testFile, "Some content");

    const res = await request(app)
      .post("/api/documents/upload")
      .field("document_type", "invalid_type")
      .attach("file", testFile);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid document_type");
  });
});

describe("GET /api/documents", () => {
  it("returns a list of uploaded documents", async () => {
    const res = await request(app).get("/api/documents");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/documents/:id", () => {
  it("returns 404 for non-existent document", async () => {
    const res = await request(app).get("/api/documents/nonexistent-id");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Document not found");
  });
});
