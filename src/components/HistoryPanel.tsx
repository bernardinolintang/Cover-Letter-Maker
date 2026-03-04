import { SavedCoverLetter, deleteFromHistory } from "@/lib/history";
import { Clock, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryPanelProps {
  history: SavedCoverLetter[];
  onSelect: (item: SavedCoverLetter) => void;
  onDelete: (id: string) => void;
  activeId?: string;
}

export function HistoryPanel({ history, onSelect, onDelete, activeId }: HistoryPanelProps) {
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
    <ScrollArea className="h-[420px]">
      <div className="flex flex-col gap-2 pr-3">
        {history.map((item) => (
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
              <div className="flex items-start gap-2.5 overflow-hidden">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
