import { useState, useRef, useEffect } from "react";
import { FileText, Download, Sparkles, Loader2, History, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { HistoryPanel } from "@/components/HistoryPanel";
import { loadHistory, saveToHistory, deleteFromHistory, SavedCoverLetter } from "@/lib/history";
import { downloadCoverLetterPDF } from "@/lib/pdf";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`;

const Index = () => {
  const [input, setInput] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<SavedCoverLetter[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error("Please enter some details first.");
      return;
    }

    setIsGenerating(true);
    setCoverLetter("");
    setActiveId(undefined);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ input }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate cover letter");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setCoverLetter(full);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Auto-save
      if (full.trim()) {
        const title = input.slice(0, 60).replace(/\n/g, " ").trim() || "Cover Letter";
        const saved = saveToHistory({ title, input, coverLetter: full });
        setHistory(loadHistory());
        setActiveId(saved.id);
        toast.success("Cover letter saved to history!");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectHistory = (item: SavedCoverLetter) => {
    setInput(item.input);
    setCoverLetter(item.coverLetter);
    setActiveId(item.id);
  };

  const handleDeleteHistory = (id: string) => {
    deleteFromHistory(id);
    setHistory(loadHistory());
    if (activeId === id) {
      setActiveId(undefined);
    }
    toast.success("Removed from history");
  };

  const handleDownloadPDF = () => {
    if (!coverLetter) return;
    downloadCoverLetterPDF(coverLetter);
    toast.success("PDF downloaded!");
  };

  const handleDownloadTxt = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                CoverCraft
              </h1>
              <p className="text-xs text-muted-foreground">AI-powered cover letters</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            History
            {history.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                {history.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Craft the perfect <span className="text-accent">cover letter</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Paste your job description, resume details, or any context — and let AI write a
            compelling, personalized cover letter for you.
          </p>
        </div>

        <div className={`grid gap-8 ${showHistory ? "lg:grid-cols-[280px_1fr_1fr]" : "lg:grid-cols-2"}`}>
          {/* History sidebar */}
          {showHistory && (
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <History className="h-4 w-4 text-muted-foreground" />
                Saved Letters
              </h3>
              <HistoryPanel
                history={history}
                onSelect={handleSelectHistory}
                onDelete={handleDeleteHistory}
                activeId={activeId}
              />
            </div>
          )}

          {/* Input */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground">Your Details</label>
            <Textarea
              placeholder="Paste the job description, your key skills, experience, or any context you'd like included in the cover letter…"
              className="min-h-[320px] resize-none border-border bg-card font-body text-sm leading-relaxed placeholder:text-muted-foreground/60 focus-visible:ring-accent"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !input.trim()}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </div>

          {/* Output */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Your Cover Letter</label>
              {coverLetter && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTxt}
                    className="gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    .TXT
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    .PDF
                  </Button>
                </div>
              )}
            </div>
            <div className="min-h-[320px] rounded-lg border border-border bg-card p-6">
              {coverLetter ? (
                <div className="cover-letter-output text-sm text-foreground">{coverLetter}</div>
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground/50">
                    Your AI-generated cover letter will appear here…
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
