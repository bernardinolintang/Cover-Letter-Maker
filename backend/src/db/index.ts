import type { DocumentRecord } from "../types/index.js";

const documents = new Map<string, DocumentRecord>();

export function getDocumentStore(): Map<string, DocumentRecord> {
  return documents;
}
