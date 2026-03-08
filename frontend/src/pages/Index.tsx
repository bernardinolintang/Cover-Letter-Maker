import { useState, useEffect } from "react";
import {
  Download, Sparkles, Loader2, History, User, Settings,
  AlertCircle, CheckCircle2, Pencil, Undo2, Redo2, Eraser,
  Sun, Moon, Copy, FileDown, Edit3, Check, Link2, Wand2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ProfileEditor } from "@/components/ProfileEditor";
import { InstructionsEditor } from "@/components/InstructionsEditor";
import { loadHistory, saveToHistory, deleteFromHistory, updateHistoryItem, SavedCoverLetter } from "@/lib/history";
import { loadProfile, isProfileComplete } from "@/lib/profile";
import { loadInstructions } from "@/lib/instructions";
import { loadDocuments } from "@/lib/documents";
import { downloadCoverLetterPDF } from "@/lib/pdf";
import { downloadCoverLetterDOCX } from "@/lib/docx";
import type { CandidateProfile, GenerationInstructions, CoverLetterApiRequest, CoverLetterApiResponse, QualityChecks } from "@/types/profile";

const API_URL = import.meta.env.VITE_API_URL || "";

const LOADING_MESSAGES = [
  "Analyzing job requirements...",
  "Matching with your profile...",
  "Crafting your personalized cover letter...",
  "Polishing final details...",
];

interface ParsedJobInsights {
  company_name: string;
  role_title: string;
  location: string;
  requirements: string[];
  keywords: string[];
}

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [input, setInput] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [isImportingJob, setIsImportingJob] = useState(false);
  const [isResearchingCompany, setIsResearchingCompany] = useState(false);
  const [jobInsights, setJobInsights] = useState<ParsedJobInsights | null>(null);
  const [inputHistory, setInputHistory] = useState<string[]>([""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [coverLetter, setCoverLetter] = useState("");
  const [letterTitle, setLetterTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [history, setHistory] = useState<SavedCoverLetter[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(loadProfile);
  const [instructions, setInstructions] = useState<GenerationInstructions>(loadInstructions);
  const [qualityChecks, setQualityChecks] = useState<QualityChecks | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setHistory(loadHistory());
    setProfile(loadProfile());
    setInstructions(loadInstructions());
  }, []);

  // Auto-parse job posting to highlight key requirements/keywords.
  useEffect(() => {
    if (input.trim().length < 120) {
      setJobInsights(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`${API_URL}/api/job/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_posting: input }),
          signal: controller.signal,
        });
        if (!resp.ok) return;
        const parsed = await resp.json();
        setJobInsights(parsed);
      } catch {
        // silent on typing
      }
    }, 900);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [input]);

  // Cycle loading messages while generating
  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [isGenerating]);

  const profileReady = isProfileComplete(profile);

  const setJobPostingInput = (nextValue: string, recordHistory = true) => {
    setInput(nextValue);
    if (!recordHistory) return;
    setInputHistory((prev) => {
      const currentValue = prev[historyIndex];
      if (currentValue === nextValue) return prev;
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, nextValue];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndoInput = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setInput(inputHistory[nextIndex] || "");
  };

  const handleRedoInput = () => {
    if (historyIndex >= inputHistory.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setInput(inputHistory[nextIndex] || "");
  };

  const handleClearInput = () => {
    if (!input.trim()) return;
    setJobPostingInput("");
  };

  const handleImportFromJobLink = async () => {
    if (!jobUrl.trim()) {
      toast.error("Paste a job link first.");
      return;
    }
    setIsImportingJob(true);
    try {
      const resp = await fetch(`${API_URL}/api/job/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || "Failed to import job posting from URL");
      }
      setJobPostingInput(data.text || "");
      toast.success("Job posting imported from link.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to import job posting");
    } finally {
      setIsImportingJob(false);
    }
  };

  const handleResearchCompany = async () => {
    if (!input.trim()) {
      toast.error("Add a job posting first.");
      return;
    }
    setIsResearchingCompany(true);
    try {
      const resp = await fetch(`${API_URL}/api/job/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          company_name: jobInsights?.company_name || instructions.recipient_org || "",
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || "Failed to research company context");
      }

      const contextParts = [
        data.company_summary ? `Company summary: ${data.company_summary}` : "",
        data.mission ? `Mission: ${data.mission}` : "",
        Array.isArray(data.values) && data.values.length
          ? `Values: ${data.values.join(", ")}`
          : "",
        Array.isArray(data.recent_news) && data.recent_news.length
          ? `Recent news: ${data.recent_news.join("; ")}`
          : "",
      ].filter(Boolean);

      const mergedContext = contextParts.join("\n");
      const next = { ...instructions, company_context: mergedContext };
      setInstructions(next);
      toast.success("Company context added to instructions.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Company research failed");
    } finally {
      setIsResearchingCompany(false);
    }
  };

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
    setIsEditingLetter(false);

    try {
      const { experiences, projects, education, ...profileRest } = profile;

      const cleanProfile = Object.fromEntries(
        Object.entries(profileRest).map(([k, v]) =>
          [k, typeof v === "string" && v.trim() === "" ? undefined : v]
        )
      );

      const primaryEdu = education[0];

      const docs = loadDocuments();
      const documentTexts = docs
        .filter((d) => d.extracted_text)
        .map((d) => ({ filename: d.filename, text: d.extracted_text }));

      const body: CoverLetterApiRequest = {
        candidate_profile: {
          ...cleanProfile,
          name: profile.name,
          location: profile.location,
          phone: profile.phone,
          email: profile.email,
          skills: profile.skills,
          ...(primaryEdu?.programme && { programme: primaryEdu.programme }),
          ...(primaryEdu?.university && { university: primaryEdu.university }),
          ...(primaryEdu?.degree_year && { degree_year: primaryEdu.degree_year }),
          experiences: experiences.map(({ id: _id, ...rest }) => rest),
          projects: projects.length > 0
            ? projects.map(({ id: _id, ...rest }) => rest)
            : undefined,
        } as CoverLetterApiRequest["candidate_profile"],
        job_posting: input,
        ...(instructions.company_context && { company_context: instructions.company_context }),
        ...(instructions.tone && { tone: instructions.tone }),
        ...(jobInsights?.keywords?.length && { priority_keywords: jobInsights.keywords.slice(0, 10) }),
        ...(instructions.availability && { availability: instructions.availability }),
        ...(instructions.recipient_name && { recipient_name: instructions.recipient_name }),
        ...(instructions.recipient_title && { recipient_title: instructions.recipient_title }),
        ...(instructions.recipient_org && { recipient_org: instructions.recipient_org }),
        ...(instructions.recipient_location && { recipient_location: instructions.recipient_location }),
        ...(instructions.date && { date: instructions.date }),
        ...(instructions.system_prompt && { system_prompt: instructions.system_prompt }),
        ...(documentTexts.length > 0 && { document_texts: documentTexts }),
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
    setInputHistory([item.input]);
    setHistoryIndex(0);
    setCoverLetter(item.coverLetter);
    setLetterTitle(item.title);
    setActiveId(item.id);
    setQualityChecks(null);
    setIsEditingLetter(false);
  };

  const handleDeleteHistory = (id: string) => {
    deleteFromHistory(id);
    setHistory(loadHistory());
    if (activeId === id) setActiveId(undefined);
    toast.success("Removed from history");
  };

  const handleHistoryUpdated = () => {
    setHistory(loadHistory());
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

  const handleDownloadDocx = async () => {
    if (!coverLetter) return;
    await downloadCoverLetterDOCX(coverLetter, `${sanitizeFilename(letterTitle)}.docx`);
    toast.success("DOCX downloaded!");
  };

  const handleCopyToClipboard = async () => {
    if (!coverLetter) return;
    try {
      await navigator.clipboard.writeText(coverLetter);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy. Try selecting the text manually.");
    }
  };

  const handleSaveEdit = () => {
    setIsEditingLetter(false);
    if (activeId) {
      updateHistoryItem(activeId, { coverLetter });
      setHistory(loadHistory());
      toast.success("Changes saved");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="h-screen bg-background transition-colors overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
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
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}
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
      <main className="mx-auto flex h-[calc(100vh-81px)] max-w-7xl flex-col px-6 py-4">
        <div className="mb-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Craft the perfect <span className="text-accent">cover letter</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Set up your profile, paste a job posting, and let AI write a
            compelling, personalized cover letter tailored to you.
          </p>

          {!profileReady && (
            <button
              onClick={() => setShowProfile(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-800 hover:bg-amber-100 transition-colors dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              <AlertCircle className="h-4 w-4" />
              Complete your profile to get started
            </button>
          )}
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-4">
          <StepCard title="Step 1" subtitle="Upload Resume" done={profile.skills.length > 0 || profile.experiences.length > 0} />
          <StepCard title="Step 2" subtitle="Paste or Import Job" done={input.trim().length > 0} />
          <StepCard title="Step 3" subtitle="Customize Instructions" done={Boolean(instructions.company_context || instructions.tone || instructions.recipient_org)} />
          <StepCard title="Step 4" subtitle="Generate Letter" done={Boolean(coverLetter)} />
        </div>

        <div className={`grid flex-1 min-h-0 gap-5 ${showHistory ? "lg:grid-cols-[300px_1fr_1fr]" : "lg:grid-cols-2"}`}>
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
                onHistoryUpdated={handleHistoryUpdated}
              />
            </div>
          )}

          {/* Input */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Job Posting</label>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndoInput}
                  disabled={historyIndex === 0}
                  className="h-7 w-7 p-0"
                  title="Undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedoInput}
                  disabled={historyIndex >= inputHistory.length - 1}
                  className="h-7 w-7 p-0"
                  title="Redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearInput}
                  disabled={!input.trim()}
                  className="h-7 w-7 p-0"
                  title="Clear"
                >
                  <Eraser className="h-3.5 w-3.5" />
                </Button>
                {profileReady && profile.name && (
                  <Badge variant="secondary" className="text-xs gap-1 ml-1">
                    <User className="h-3 w-3" />
                    {profile.name.split(" ")[0]}
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Import from Job Link</p>
              <div className="flex gap-2">
                <Input
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://jobs.company.com/role"
                  className="h-9"
                />
                <Button
                  variant="outline"
                  onClick={handleImportFromJobLink}
                  disabled={isImportingJob}
                  className="h-9 gap-1.5"
                >
                  {isImportingJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Import
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <Textarea
                placeholder="Paste the full job posting here. The AI will extract the role, company, requirements, and tailor your cover letter to match your profile."
                className="h-full min-h-0 resize-none border-border bg-card font-body text-sm leading-relaxed placeholder:text-muted-foreground/60 focus-visible:ring-accent"
                value={input}
                onChange={(e) => setJobPostingInput(e.target.value)}
              />
            </div>

            {jobInsights && (
              <div className="rounded-lg border border-border/60 bg-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Auto-detected keywords and requirements
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResearchCompany}
                    disabled={isResearchingCompany}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {isResearchingCompany ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Research Company
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobInsights.keywords.slice(0, 12).map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Company: <span className="font-medium text-foreground">{jobInsights.company_name}</span> • Role: <span className="font-medium text-foreground">{jobInsights.role_title}</span>
                </p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !input.trim()}
              className="gap-3 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-14 rounded-xl shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/30"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="animate-pulse">{LOADING_MESSAGES[loadingStep]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </div>

          {/* Output */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Your Cover Letter</label>
              {coverLetter && (
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    className="gap-1.5 text-xs h-7"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadTxt} className="gap-1.5 text-xs h-7">
                    <Download className="h-3 w-3" />
                    .TXT
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadDocx} className="gap-1.5 text-xs h-7">
                    <FileDown className="h-3 w-3" />
                    .DOCX
                  </Button>
                  <Button size="sm" onClick={handleDownloadPDF} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-7">
                    <Download className="h-3 w-3" />
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

            <div className="relative flex-1 min-h-0 rounded-lg border border-border bg-card p-4 sm:p-6">
              {coverLetter ? (
                <>
                  {/* Edit toggle */}
                  <div className="absolute top-3 right-3 z-10">
                    {isEditingLetter ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveEdit}
                        className="gap-1.5 text-xs h-7 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                      >
                        <Check className="h-3 w-3" />
                        Done
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingLetter(true)}
                        className="gap-1.5 text-xs h-7"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {isEditingLetter ? (
                    <Textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="h-full min-h-0 resize-none border-0 p-0 shadow-none focus-visible:ring-0 font-body text-sm leading-relaxed overflow-y-auto"
                    />
                  ) : (
                    <div
                      className="cover-letter-output h-full overflow-y-auto pr-16 text-sm text-foreground"
                    >
                      {coverLetter}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground/50">
                    Your AI-generated cover letter will appear here...
                  </p>
                </div>
              )}
            </div>

            {/* Quality Checks */}
            {qualityChecks && (
              <div className="flex flex-wrap gap-2">
                <QualityBadge
                  label="No Dashes"
                  pass={qualityChecks.no_dashes}
                  description="Checks that the letter has no dash characters."
                />
                <QualityBadge
                  label="No Bullets"
                  pass={qualityChecks.no_bullets}
                  description="Checks that the letter contains paragraphs only, with no bullets or numbered lists."
                />
                <QualityBadge
                  label="Format OK"
                  pass={qualityChecks.format_ok}
                  description="Checks header, recipient block, salutation, paragraphs, and sign-off structure."
                />
                <QualityBadge
                  label="Word Count"
                  pass={qualityChecks.length_ok}
                  description="Checks that letter length is between 280 and 380 words."
                />
                <QualityBadge
                  label="Availability"
                  pass={qualityChecks.availability_mentioned}
                  description="Checks that your availability is explicitly mentioned in the opening paragraph."
                />
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

function QualityBadge({
  label,
  pass,
  description,
}: {
  label: string;
  pass: boolean;
  description: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={pass ? "secondary" : "destructive"}
          className="gap-1 text-xs cursor-help"
        >
          {pass ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

function StepCard({
  title,
  subtitle,
  done,
}: {
  title: string;
  subtitle: string;
  done: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{subtitle}</p>
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        )}
      </div>
    </div>
  );
}

export default Index;
