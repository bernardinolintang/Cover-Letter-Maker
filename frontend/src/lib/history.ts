export interface SavedCoverLetter {
  id: string;
  title: string;
  input: string;
  coverLetter: string;
  createdAt: string;
  collectionId?: string;
}

const STORAGE_KEY = "covercraft-history";

export function loadHistory(): SavedCoverLetter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<SavedCoverLetter, "id" | "createdAt">): SavedCoverLetter {
  const history = loadHistory();
  const item: SavedCoverLetter = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  history.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  return item;
}

export function updateHistoryItem(id: string, updates: Partial<SavedCoverLetter>): void {
  const history = loadHistory();
  const idx = history.findIndex((h) => h.id === id);
  if (idx >= 0) {
    history[idx] = { ...history[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
}

export function deleteFromHistory(id: string) {
  const history = loadHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
