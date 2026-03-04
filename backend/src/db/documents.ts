import { getDb } from "./index.js";
import type { DocumentRecord, DocumentType } from "../types/index.js";

export function insertDocument(doc: DocumentRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO documents (id, filename, mime_type, size_bytes, document_type, storage_path, extracted_text, created_at)
    VALUES (@id, @filename, @mime_type, @size_bytes, @document_type, @storage_path, @extracted_text, @created_at)
  `).run(doc);
}

export function getDocumentById(id: string): DocumentRecord | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as
    | DocumentRecord
    | undefined;
}

export function listDocuments(): DocumentRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM documents ORDER BY created_at DESC").all() as DocumentRecord[];
}

export function getDocumentsByIds(ids: string[]): DocumentRecord[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  return db
    .prepare(`SELECT * FROM documents WHERE id IN (${placeholders})`)
    .all(...ids) as DocumentRecord[];
}
