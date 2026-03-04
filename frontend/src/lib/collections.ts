import type { Collection } from "@/types/profile";

const STORAGE_KEY = "covercraft-collections";

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function loadCollections(): Collection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createCollection(name: string): Collection {
  const collections = loadCollections();
  const color = PALETTE[collections.length % PALETTE.length];
  const collection: Collection = {
    id: crypto.randomUUID(),
    name,
    color,
  };
  collections.push(collection);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  return collection;
}

export function deleteCollection(id: string): void {
  const collections = loadCollections().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}
