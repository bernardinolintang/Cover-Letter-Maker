import { useState, useEffect } from "react";
import { Download, Sparkles, Loader2, History, User, Settings, AlertCircle, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ProfileEditor } from "@/components/ProfileEditor";
import { InstructionsEditor } from "@/components/InstructionsEditor";
import { loadHistory, saveToHistory, deleteFromHistory, SavedCoverLetter } from "@/lib/history";
import { loadProfile, isProfileComplete } from "@/lib/profile";
import { loadInstructions } from "@/lib/instructions";
import { downloadCoverLetterPDF } from "@/lib/pdf";
import type { CandidateProfile, GenerationInstructions, CoverLetterApiRequest, CoverLetterApiResponse, QualityChecks } from "@/types/profile";

const API_URL = "http://localhost:3001";

function buildDefaultTitle(profileName: string, roleTitle?: string, company?: string): string {
  const firstName = profileName.split(" ")[0] || "My";
  if (roleTitle && company) {
    return `${firstName}'s Cover Letter for ${roleTitle} at ${company}`;
  }
  if (company) {
    return `${firstName}'s Cover Letter for ${company}`;
  }
  return `${firstName}'s Cover Letter`;
}

const Index = () => {
  const [input, setInput] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [letterTitle, setLetterTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<SavedCoverLetter[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(loadProfile);
  const [instructions, setInstructions] = useState<GenerationInstructions>(loadInstructions);
  const [qualityChecks, setQualityChecks] = useState<QualityChecks | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    setProfile(loadProfile());
    setInstructions(loadInstructions());
  }, []);

  const profileReady = isProfileComplete(profile);

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error("Please paste a job posting first.");
      return;
    }

    if (!profileReady) {
      toast.error("Please complete your profile first (name, email, location, phone).");
      setShowProfile(true);
      return;
    }

    setIsGenerating(true);
    setCoverLetter("");
    setQualityChecks(null);
    setActiveId(undefined);

    try {
      const { experiences, projects, ...profileRest } = profile;

      const cleanProfile = Object.fromEntries(
        Object.entries(profileRest).map(([k, v]) =>
          [k, typeof v === "string" && v.trim() === "" ? undefined : v]
        )
      );

      const body: CoverLetterApiRequest = {
        candidate_profile: {
          ...cleanProfile,
          name: profile.name,
          location: profile.location,
          phone: profile.phone,
          email: profile.email,
          skills: profile.skills,
          experiences: experiences.map(({ id: _id, ...rest }) => rest),
          projects: projects.length > 0
            ? projects.map(({ id: _id, ...rest }) => rest)
            : undefined,
        } as CoverLetterApiRequest["candidate_profile"],
        job_posting: input,
        ...(instructions.company_context && { company_context: instructions.company_context }),
        ...(instructions.availability && { availability: instructions.availability }),
        ...(instructions.recipient_name && { recipient_name: instructions.recipient_name }),
        ...(instructions.recipient_title && { recipient_title: instructions.recipient_title }),
        ...(instructions.recipient_org && { recipient_org: instructions.recipient_org }),
        ...(instructions.recipient_location && { recipient_location: instructions.recipient_location }),
        ...(instructions.date && { date: instructions.date }),
        ...(instructions.system_prompt && { system_prompt: instructions.system_prompt }),
      };

      const resp = await fetch(`${API_URL}/api/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        let message = err.error || "Failed to generate cover letter";
        if (err.details) {
          const fields = Object.entries(err.details)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("; ");
          message += ` (${fields})`;
        }
        throw new Error(message);
      }

      const data: CoverLetterApiResponse = await resp.json();
      setCoverLetter(data.cover_letter_text);
      setQualityChecks(data.quality_checks);

      const autoTitle = buildDefaultTitle(
        profile.name,
        data.extracted_fields.role_title,
        data.extracted_fields.company
      );
      setLetterTitle(autoTitle);

      if (data.cover_letter_text.trim()) {
        const saved = saveToHistory({ title: autoTitle, input, coverLetter: data.cover_letter_text });
        setHistory(loadHistory());
        setActiveId(saved.id);
        toast.success("Cover letter generated and saved!");
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
    setLetterTitle(item.title);
    setActiveId(item.id);
    setQualityChecks(null);
  };

  const handleDeleteHistory = (id: string) => {
    deleteFromHistory(id);
    setHistory(loadHistory());
    if (activeId === id) setActiveId(undefined);
    toast.success("Removed from history");
  };

  const sanitizeFilename = (name: string) =>
    name.replace(/[^a-zA-Z0-9\s']/g, "").replace(/\s+/g, " ").trim() || "cover-letter";

  const handleDownloadPDF = () => {
    if (!coverLetter) return;
    downloadCoverLetterPDF(coverLetter, `${sanitizeFilename(letterTitle)}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handleDownloadTxt = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(letterTitle)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CoverCraft" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                CoverCraft
              </h1>
              <p className="text-xs text-muted-foreground">AI-powered cover letters</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              Profile
              {profileReady ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInstructions(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Instructions
            </Button>
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
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Craft the perfect <span className="text-accent">cover letter</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Set up your profile, paste a job posting, and let AI write a
            compelling, personalized cover letter tailored to you.
          </p>

          {!profileReady && (
            <button
              onClick={() => setShowProfile(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="h-4 w-4" />
              Complete your profile to get started
            </button>
          )}
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Job Posting</label>
              {profileReady && profile.name && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <User className="h-3 w-3" />
                  {profile.name}
                </Badge>
              )}
            </div>
            <Textarea
              placeholder="Paste the full job posting here. The AI will extract the role, company, requirements, and tailor your cover letter to match your profile."
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
                  Generating...
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
                  <Button variant="outline" size="sm" onClick={handleDownloadTxt} className="gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    .TXT
                  </Button>
                  <Button size="sm" onClick={handleDownloadPDF} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    .PDF
                  </Button>
                </div>
              )}
            </div>

            {/* Editable title */}
            {coverLetter && (
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <Input
                    value={letterTitle}
                    onChange={(e) => setLetterTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setIsEditingTitle(false); }}
                    autoFocus
                    className="text-sm font-medium h-8"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent transition-colors text-left"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{letterTitle || "Untitled Cover Letter"}</span>
                  </button>
                )}
              </div>
            )}

            <div className="min-h-[320px] rounded-lg border border-border bg-card p-6">
              {coverLetter ? (
                <div className="cover-letter-output text-sm text-foreground">{coverLetter}</div>
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground/50">
                    Your AI-generated cover letter will appear here...
                  </p>
                </div>
              )}
            </div>

            {/* Quality Checks */}
            {qualityChecks && (
              <div className="flex flex-wrap gap-2">
                <QualityBadge label="No Dashes" pass={qualityChecks.no_dashes} />
                <QualityBadge label="No Bullets" pass={qualityChecks.no_bullets} />
                <QualityBadge label="Format OK" pass={qualityChecks.format_ok} />
                <QualityBadge label="Word Count" pass={qualityChecks.length_ok} />
                <QualityBadge label="Availability" pass={qualityChecks.availability_mentioned} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Slide-out panels */}
      <ProfileEditor
        open={showProfile}
        onOpenChange={setShowProfile}
        onProfileSaved={setProfile}
      />
      <InstructionsEditor
        open={showInstructions}
        onOpenChange={setShowInstructions}
        onInstructionsSaved={setInstructions}
      />
    </div>
  );
};

function QualityBadge({ label, pass }: { label: string; pass: boolean }) {
  return (
    <Badge
      variant={pass ? "secondary" : "destructive"}
      className="gap-1 text-xs"
    >
      {pass ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}

export default Index;
