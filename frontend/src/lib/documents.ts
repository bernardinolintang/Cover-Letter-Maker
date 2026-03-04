import type { UploadedDocument } from "@/types/profile";

const STORAGE_KEY = "covercraft-documents";

export function loadDocuments(): UploadedDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDocument(doc: UploadedDocument): void {
  const docs = loadDocuments();
  if (docs.some((d) => d.id === doc.id)) return;
  docs.unshift(doc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function removeDocument(id: string): void {
  const docs = loadDocuments().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}
