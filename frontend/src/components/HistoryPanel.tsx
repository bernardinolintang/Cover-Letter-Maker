import { useState } from "react";
import { SavedCoverLetter, updateHistoryItem } from "@/lib/history";
import { loadCollections, createCollection } from "@/lib/collections";
import type { Collection } from "@/types/profile";
import { Clock, Trash2, FileText, FolderPlus, Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface HistoryPanelProps {
  history: SavedCoverLetter[];
  onSelect: (item: SavedCoverLetter) => void;
  onDelete: (id: string) => void;
  activeId?: string;
  onHistoryUpdated: () => void;
}

export function HistoryPanel({ history, onSelect, onDelete, activeId, onHistoryUpdated }: HistoryPanelProps) {
  const [collections, setCollections] = useState<Collection[]>(loadCollections);
  const [filterCollectionId, setFilterCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");

  const refreshCollections = () => setCollections(loadCollections());

  const handleCreateCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return;
    createCollection(name);
    refreshCollections();
    setNewCollectionName("");
    toast.success(`Collection "${name}" created`);
  };

  const handleAssignCollection = (itemId: string, collectionId: string | undefined) => {
    updateHistoryItem(itemId, { collectionId });
    onHistoryUpdated();
    toast.success(collectionId ? "Added to collection" : "Removed from collection");
  };

  const filtered = filterCollectionId
    ? history.filter((h) => h.collectionId === filterCollectionId)
    : history;

  const getCollectionForItem = (item: SavedCoverLetter) =>
    collections.find((c) => c.id === item.collectionId);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="mb-3 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground/60">No saved cover letters yet.</p>
        <p className="mt-1 text-xs text-muted-foreground/40">Generated letters will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Collection filter + create */}
      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-1">
              <Filter className="h-3 w-3" />
              {filterCollectionId
                ? collections.find((c) => c.id === filterCollectionId)?.name || "All"
                : "All"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <button
              onClick={() => setFilterCollectionId(null)}
              className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted ${
                !filterCollectionId ? "bg-muted font-medium" : ""
              }`}
            >
              All Letters
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCollectionId(c.id)}
                className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 ${
                  filterCollectionId === c.id ? "bg-muted font-medium" : ""
                }`}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            ))}
            <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
                placeholder="New collection..."
                className="h-7 text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Letter list */}
      <ScrollArea className="h-[500px]">
        <div className="flex flex-col gap-2 pr-3">
          {filtered.map((item) => {
            const col = getCollectionForItem(item);
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`group cursor-pointer rounded-lg border p-3 transition-colors hover:bg-secondary/50 ${
                  activeId === item.id
                    ? "border-accent/50 bg-accent/5"
                    : "border-border/50 bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug break-words">
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {col && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px] gap-1 border-0"
                            style={{ backgroundColor: col.color + "22", color: col.color }}
                          >
                            {col.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FolderPlus className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="end" onClick={(e) => e.stopPropagation()}>
                        <p className="text-xs font-medium mb-1.5 text-muted-foreground">Add to collection</p>
                        {item.collectionId && (
                          <button
                            onClick={() => handleAssignCollection(item.id, undefined)}
                            className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2"
                          >
                            <X className="h-3 w-3" /> Remove from collection
                          </button>
                        )}
                        {collections.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAssignCollection(item.id, c.id)}
                            className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2 ${
                              item.collectionId === c.id ? "bg-muted font-medium" : ""
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </button>
                        ))}
                        {collections.length === 0 && (
                          <p className="text-xs text-muted-foreground/60 py-1 px-2">
                            No collections yet. Create one using the filter above.
                          </p>
                        )}
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && filterCollectionId && (
            <p className="text-xs text-muted-foreground/60 text-center py-6">
              No letters in this collection.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
