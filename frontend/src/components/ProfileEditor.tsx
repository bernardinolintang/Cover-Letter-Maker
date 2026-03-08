import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import {
  User, Plus, X, Briefcase, GraduationCap, FolderOpen, Wrench,
  Save, Upload, Loader2, FileUp, Trash2, FileText, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { CandidateProfile, Experience, Project, Education, UploadedDocument } from "@/types/profile";
import { loadProfile, saveProfile, DEFAULT_PROFILE } from "@/lib/profile";
import { loadDocuments, addDocument, removeDocument } from "@/lib/documents";
import { extractTextFromFile } from "@/lib/fileTextExtractor";

const API_URL = import.meta.env.VITE_API_URL || "";

const SKILL_SUGGESTIONS = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Rust", "Ruby",
  "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "SQL", "HTML", "CSS", "Sass",
  "React", "Next.js", "Vue.js", "Angular", "Svelte", "Node.js", "Express.js", "FastAPI",
  "Flask", "Django", "Spring Boot", "Ruby on Rails", "ASP.NET", "Laravel",
  "TailwindCSS", "Bootstrap", "Material UI", "Chakra UI", "shadcn/ui",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "DynamoDB", "Snowflake",
  "Firebase", "Supabase", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
  "Git", "GitHub Actions", "CI/CD", "Jenkins", "Linux", "Nginx",
  "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "OpenAI API",
  "LLMs", "Prompt Engineering", "RAG", "LangChain", "Hugging Face",
  "GraphQL", "REST API", "gRPC", "WebSockets", "OAuth", "JWT",
  "Figma", "Adobe XD", "Photoshop", "Illustrator", "Blender",
  "Jira", "Confluence", "Notion", "Slack", "Trello",
  "Agile", "Scrum", "Kanban", "Product Management", "Project Management",
  "Data Analysis", "Data Engineering", "Machine Learning", "Deep Learning",
  "Natural Language Processing", "Computer Vision", "Data Visualization",
  "Power BI", "Tableau", "Looker", "Excel", "Google Sheets",
  "Selenium", "Cypress", "Jest", "Vitest", "Pytest", "JUnit",
  "Postman", "Swagger", "Webpack", "Vite", "Babel", "ESLint",
  "Apache Spark", "Hadoop", "Kafka", "Airflow", "dbt",
  "Solidity", "Web3", "Blockchain",
  "Unity", "Unreal Engine", "Game Development",
  "UI/UX Design", "Wireframing", "Prototyping", "User Research",
  "Technical Writing", "Public Speaking", "Leadership", "Teamwork",
  "Communication", "Problem Solving", "Critical Thinking", "Creativity",
  "Anaconda", "Seaborn", "Matplotlib",
];

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileSaved: (profile: CandidateProfile) => void;
}

export function ProfileEditor({ open, onOpenChange, onProfileSaved }: ProfileEditorProps) {
  const [profile, setProfile] = useState<CandidateProfile>(loadProfile);
  const [skillInput, setSkillInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>(loadDocuments);
  const [pendingDeleteId, setPendingDeleteId] = useState<{ type: string; id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setProfile(loadProfile());
      setDocuments(loadDocuments());
    }
  }, [open]);

  const update = <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const scrollToNewEntry = useCallback(() => {
    requestAnimationFrame(() => {
      const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    });
  }, []);

  // ── Skills ───────────────────────────────────

  const filteredSuggestions = skillInput.trim().length >= 2
    ? SKILL_SUGGESTIONS.filter(
        (s) =>
          s.toLowerCase().includes(skillInput.toLowerCase()) &&
          !profile.skills.includes(s)
      ).slice(0, 8)
    : [];

  const addSkill = (skillName?: string) => {
    const skill = (skillName || skillInput).trim();
    if (!skill || profile.skills.includes(skill)) return;
    update("skills", [...profile.skills, skill]);
    setSkillInput("");
    setShowSuggestions(false);
    skillInputRef.current?.focus();
  };

  const removeSkill = (skill: string) => {
    update("skills", profile.skills.filter((s) => s !== skill));
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        addSkill(filteredSuggestions[0]);
      } else {
        addSkill();
      }
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // ── Education ──────────────────────────────────

  const addEducation = () => {
    const edu: Education = {
      id: crypto.randomUUID(),
      programme: "",
      university: "",
      degree_year: "",
    };
    update("education", [...profile.education, edu]);
    scrollToNewEntry();
    toast.info("New education entry added below.");
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    update(
      "education",
      profile.education.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeEducation = (id: string) => {
    update("education", profile.education.filter((e) => e.id !== id));
    toast.success("Education entry removed.");
  };

  // ── Experiences ──────────────────────────────

  const addExperience = () => {
    const exp: Experience = {
      id: crypto.randomUUID(),
      title: "",
      company: "",
      start_date: "",
      end_date: "",
      description: "",
      outcomes: [],
    };
    update("experiences", [...profile.experiences, exp]);
    scrollToNewEntry();
    toast.info("New experience entry added below.");
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | string[]) => {
    update(
      "experiences",
      profile.experiences.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeExperience = (id: string) => {
    update("experiences", profile.experiences.filter((e) => e.id !== id));
    toast.success("Experience entry removed.");
  };

  // ── Projects ─────────────────────────────────

  const addProject = () => {
    const proj: Project = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      technologies: [],
      outcomes: [],
    };
    update("projects", [...profile.projects, proj]);
    scrollToNewEntry();
    toast.info("New project entry added below.");
  };

  const updateProject = (id: string, field: keyof Project, value: string | string[]) => {
    update(
      "projects",
      profile.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removeProject = (id: string) => {
    update("projects", profile.projects.filter((p) => p.id !== id));
    toast.success("Project entry removed.");
  };

  // ── Confirm delete ──────────────────────────

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const { type, id } = pendingDeleteId;
    if (type === "education") removeEducation(id);
    else if (type === "experience") removeExperience(id);
    else if (type === "project") removeProject(id);
    else if (type === "document") {
      removeDocument(id);
      setDocuments(loadDocuments());
      toast.success("Document removed from library.");
    }
    setPendingDeleteId(null);
  };

  // ── Reset Profile ───────────────────────────

  const handleResetProfile = () => {
    setProfile({ ...DEFAULT_PROFILE });
    saveProfile({ ...DEFAULT_PROFILE });
    toast.success("Profile has been reset to blank.");
  };

  // ── Resume Upload & Auto-fill ─────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      toast.info("Extracting text from document...");
      const text = await extractTextFromFile(file);

      if (!text || text.trim().length < 20) {
        throw new Error("Could not extract enough text from this file. Try a different format.");
      }

      addDocument({
        id: crypto.randomUUID(),
        filename: file.name,
        document_type: "resume",
        uploadedAt: new Date().toISOString(),
        extracted_text: text,
      });
      setDocuments(loadDocuments());

      toast.info("Analyzing your resume with AI...");
      const extractResp = await fetch(`${API_URL}/api/profile/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 15000) }),
      });
      if (!extractResp.ok) {
        const err = await extractResp.json().catch(() => ({}));
        throw new Error(err.error || "AI extraction failed");
      }

      const extracted = await extractResp.json();

      setProfile((prev) => {
        const newEducation = [...prev.education];
        if (extracted.programme || extracted.university || extracted.degree_year) {
          const hasMatch = newEducation.some(
            (e) =>
              e.programme === extracted.programme &&
              e.university === extracted.university
          );
          if (!hasMatch) {
            newEducation.push({
              id: crypto.randomUUID(),
              programme: extracted.programme || "",
              university: extracted.university || "",
              degree_year: extracted.degree_year || "",
            });
          }
        }

        return {
          ...prev,
          name: extracted.name || prev.name,
          email: extracted.email || prev.email,
          phone: extracted.phone || prev.phone,
          location: extracted.location || prev.location,
          linkedin_url: extracted.linkedin_url || prev.linkedin_url,
          website_url: extracted.website_url || prev.website_url,
          education: newEducation,
          skills: extracted.skills?.length
            ? [...new Set([...prev.skills, ...extracted.skills])]
            : prev.skills,
          experiences: extracted.experiences?.length
            ? [
                ...prev.experiences,
                ...extracted.experiences.map((exp: Omit<Experience, "id">) => ({
                  ...exp,
                  id: crypto.randomUUID(),
                })),
              ]
            : prev.experiences,
          projects: extracted.projects?.length
            ? [
                ...prev.projects,
                ...extracted.projects.map((proj: Omit<Project, "id">) => ({
                  ...proj,
                  id: crypto.randomUUID(),
                })),
              ]
            : prev.projects,
        };
      });

      toast.success("Profile auto-filled from your document! Review and save.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Auto-fill failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Document Library Upload ───────────────────

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      toast.info("Extracting text from document...");
      const text = await extractTextFromFile(file);

      addDocument({
        id: crypto.randomUUID(),
        filename: file.name,
        document_type: "portfolio",
        uploadedAt: new Date().toISOString(),
        extracted_text: text || "",
      });
      setDocuments(loadDocuments());
      toast.success(`Document "${file.name}" added to your library`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setIsUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = "";
    }
  };

  // ── Save ─────────────────────────────────────

  const handleSave = () => {
    if (!profile.name || !profile.email) {
      toast.error("Name and email are required.");
      return;
    }
    saveProfile(profile);
    onProfileSaved(profile);
    toast.success("Profile saved!");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate Profile
            </SheetTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset entire profile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your profile data including personal info, education, skills, experiences, and projects. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetProfile}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <SheetDescription>
            Your personal details, skills, and experience. Saved locally and used for every cover letter.
          </SheetDescription>
          <div className="pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full gap-2 border-dashed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting profile from document...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Resume / CV to auto-fill
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              Supports PDF, DOCX, and TXT. Existing fields won't be overwritten if already filled.
            </p>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
          <div className="space-y-6 pb-6">
            {/* ── Personal Info ── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" value={profile.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={profile.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@example.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(416) 555 0199" />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={profile.location} onChange={(e) => update("location", e.target.value)} placeholder="Toronto, Ontario" />
                </div>
                <div>
                  <Label htmlFor="availability">Default Availability</Label>
                  <Input id="availability" value={profile.availability_default || ""} onChange={(e) => update("availability_default", e.target.value)} placeholder="1 May 2026 to 31 Aug 2026" />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input id="linkedin" value={profile.linkedin_url || ""} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/janedoe" />
                </div>
                <div>
                  <Label htmlFor="website">Website URL</Label>
                  <Input id="website" value={profile.website_url || ""} onChange={(e) => update("website_url", e.target.value)} placeholder="https://janedoe.dev" />
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Education ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Education
                </h3>
                <Button variant="outline" size="sm" onClick={addEducation} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {profile.education.map((edu) => (
                  <div key={edu.id} className="rounded-lg border border-border p-3 space-y-2 relative">
                    <button
                      onClick={() => setPendingDeleteId({ type: "education", id: edu.id })}
                      className="absolute top-2 right-2 rounded-full p-1 hover:bg-destructive/10 text-destructive"
                      title="Remove education"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Programme</Label>
                        <Input value={edu.programme} onChange={(e) => updateEducation(edu.id, "programme", e.target.value)} placeholder="BSc Computer Science" />
                      </div>
                      <div>
                        <Label>University</Label>
                        <Input value={edu.university} onChange={(e) => updateEducation(edu.id, "university", e.target.value)} placeholder="University of Toronto" />
                      </div>
                      <div>
                        <Label>Year</Label>
                        <Input value={edu.degree_year || ""} onChange={(e) => updateEducation(edu.id, "degree_year", e.target.value)} placeholder="2026" />
                      </div>
                    </div>
                  </div>
                ))}
                {profile.education.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No education added yet. Click + to add.</p>
                )}
              </div>
            </section>

            <Separator />

            {/* ── Skills ── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Skills
              </h3>
              <div className="relative mb-3">
                <div className="flex gap-2">
                  <Input
                    ref={skillInputRef}
                    value={skillInput}
                    onChange={(e) => { setSkillInput(e.target.value); setShowSuggestions(true); }}
                    onKeyDown={handleSkillKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Type a skill and press Enter"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => addSkill()} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-10 mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); addSkill(suggestion); }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {profile.skills.length === 0 && (
                  <p className="text-xs text-muted-foreground">No skills added yet.</p>
                )}
              </div>
            </section>

            <Separator />

            {/* ── Experiences ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Experiences
                </h3>
                <Button variant="outline" size="sm" onClick={addExperience} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="space-y-4">
                {profile.experiences.map((exp) => (
                  <div key={exp.id} className="rounded-lg border border-border p-4 space-y-3 relative">
                    <button
                      onClick={() => setPendingDeleteId({ type: "experience", id: exp.id })}
                      className="absolute top-3 right-3 rounded-full p-1 hover:bg-destructive/10 text-destructive"
                      title="Remove experience"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Title</Label>
                        <Input value={exp.title} onChange={(e) => updateExperience(exp.id, "title", e.target.value)} placeholder="Product Intern" />
                      </div>
                      <div>
                        <Label>Company</Label>
                        <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder="TechStart Inc." />
                      </div>
                      <div>
                        <Label>Start Date</Label>
                        <Input value={exp.start_date} onChange={(e) => updateExperience(exp.id, "start_date", e.target.value)} placeholder="May 2024" />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input value={exp.end_date || ""} onChange={(e) => updateExperience(exp.id, "end_date", e.target.value)} placeholder="Aug 2024 (or blank for present)" />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                        placeholder="What did you do in this role?"
                        className="min-h-[60px] resize-none text-sm"
                      />
                    </div>
                    <div>
                      <Label>Outcomes (one per line)</Label>
                      <Textarea
                        value={(exp.outcomes || []).join("\n")}
                        onChange={(e) => updateExperience(exp.id, "outcomes", e.target.value.split("\n").filter((o) => o.trim()))}
                        placeholder="Reduced onboarding drop off by 22%"
                        className="min-h-[50px] resize-none text-sm"
                      />
                    </div>
                  </div>
                ))}
                {profile.experiences.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No experiences added yet.</p>
                )}
              </div>
            </section>

            <Separator />

            {/* ── Projects ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  Projects
                </h3>
                <Button variant="outline" size="sm" onClick={addProject} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="space-y-4">
                {profile.projects.map((proj) => (
                  <div key={proj.id} className="rounded-lg border border-border p-4 space-y-3 relative">
                    <button
                      onClick={() => setPendingDeleteId({ type: "project", id: proj.id })}
                      className="absolute top-3 right-3 rounded-full p-1 hover:bg-destructive/10 text-destructive"
                      title="Remove project"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Project Name</Label>
                        <Input value={proj.name} onChange={(e) => updateProject(proj.id, "name", e.target.value)} placeholder="Analytics Dashboard" />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={proj.description}
                        onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                        placeholder="What was this project about?"
                        className="min-h-[60px] resize-none text-sm"
                      />
                    </div>
                    <div>
                      <Label>Technologies (comma separated)</Label>
                      <Input
                        value={(proj.technologies || []).join(", ")}
                        onChange={(e) => updateProject(proj.id, "technologies", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                        placeholder="React, Python, PostgreSQL"
                      />
                    </div>
                    <div>
                      <Label>Outcomes (one per line)</Label>
                      <Textarea
                        value={(proj.outcomes || []).join("\n")}
                        onChange={(e) => updateProject(proj.id, "outcomes", e.target.value.split("\n").filter((o) => o.trim()))}
                        placeholder="Used by 500+ students"
                        className="min-h-[50px] resize-none text-sm"
                      />
                    </div>
                  </div>
                ))}
                {profile.projects.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No projects added yet.</p>
                )}
              </div>
            </section>

            <Separator />

            {/* ── Document Library ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-muted-foreground" />
                  My Documents
                </h3>
                <input
                  ref={docFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleDocUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => docFileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="gap-1 text-xs"
                >
                  {isUploadingDoc ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Upload
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Upload portfolios, website PDFs, transcripts, or any supporting documents. The AI will use these as reference when writing your cover letters.
              </p>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.document_type} &middot; {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId({ type: "document", id: doc.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No documents uploaded yet. Add resumes, portfolios, or other references.
                  </p>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="border-t border-border px-6 py-4">
          <Button onClick={handleSave} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="h-4 w-4" />
            Save Profile
          </Button>
        </div>

        {/* Shared delete confirmation dialog */}
        <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this {pendingDeleteId?.type}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this entry. Once deleted, it cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
