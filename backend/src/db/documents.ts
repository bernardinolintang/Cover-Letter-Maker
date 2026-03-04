import { getDocumentStore } from "./index.js";
import type { DocumentRecord } from "../types/index.js";

export function insertDocument(doc: DocumentRecord): void {
  getDocumentStore().set(doc.id, doc);
}

export function getDocumentById(id: string): DocumentRecord | undefined {
  return getDocumentStore().get(id);
}

export function listDocuments(): DocumentRecord[] {
  return Array.from(getDocumentStore().values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getDocumentsByIds(ids: string[]): DocumentRecord[] {
  const store = getDocumentStore();
  return ids
    .map((id) => store.get(id))
    .filter((doc): doc is DocumentRecord => doc !== undefined);
}
