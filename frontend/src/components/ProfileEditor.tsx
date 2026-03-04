import { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  User, Plus, X, Briefcase, GraduationCap, FolderOpen, Wrench,
  Save, Upload, Loader2, FileUp, Trash2, FileText,
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
import { toast } from "sonner";
import type { CandidateProfile, Experience, Project, Education, UploadedDocument } from "@/types/profile";
import { loadProfile, saveProfile } from "@/lib/profile";
import { loadDocuments, addDocument, removeDocument } from "@/lib/documents";

const API_URL = "http://localhost:3001";

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileSaved: (profile: CandidateProfile) => void;
}

export function ProfileEditor({ open, onOpenChange, onProfileSaved }: ProfileEditorProps) {
  const [profile, setProfile] = useState<CandidateProfile>(loadProfile);
  const [skillInput, setSkillInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>(loadDocuments);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setProfile(loadProfile());
      setDocuments(loadDocuments());
    }
  }, [open]);

  const update = <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  // ── Skills ───────────────────────────────────

  const addSkill = () => {
    const skill = skillInput.trim();
    if (!skill || profile.skills.includes(skill)) return;
    update("skills", [...profile.skills, skill]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    update("skills", profile.skills.filter((s) => s !== skill));
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addSkill(); }
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
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    update(
      "education",
      profile.education.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeEducation = (id: string) => {
    update("education", profile.education.filter((e) => e.id !== id));
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
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | string[]) => {
    update(
      "experiences",
      profile.experiences.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeExperience = (id: string) => {
    update("experiences", profile.experiences.filter((e) => e.id !== id));
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
  };

  const updateProject = (id: string, field: keyof Project, value: string | string[]) => {
    update(
      "projects",
      profile.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removeProject = (id: string) => {
    update("projects", profile.projects.filter((p) => p.id !== id));
  };

  // ── Resume Upload & Auto-fill ─────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", "resume");

      const uploadResp = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadResp.ok) {
        const err = await uploadResp.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const uploadData = await uploadResp.json();
      toast.success(`Uploaded ${uploadData.filename}`);

      addDocument({
        id: uploadData.document_id,
        filename: uploadData.filename,
        document_type: "resume",
        uploadedAt: new Date().toISOString(),
      });
      setDocuments(loadDocuments());

      const docResp = await fetch(`${API_URL}/api/documents/${uploadData.document_id}`);
      if (!docResp.ok) throw new Error("Failed to fetch document text");
      const docData = await docResp.json();

      const extractResp = await fetch(`${API_URL}/api/profile/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: docData.extracted_text }),
      });
      if (!extractResp.ok) {
        const err = await extractResp.json().catch(() => ({}));
        throw new Error(err.error || "Extraction failed");
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", "portfolio");

      const resp = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const data = await resp.json();
      addDocument({
        id: data.document_id,
        filename: data.filename,
        document_type: data.document_type || "portfolio",
        uploadedAt: new Date().toISOString(),
      });
      setDocuments(loadDocuments());
      toast.success(`Document "${data.filename}" added to your library`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = "";
    }
  };

  const handleRemoveDoc = (id: string) => {
    removeDocument(id);
    setDocuments(loadDocuments());
    toast.success("Document removed from library");
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
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Candidate Profile
          </SheetTitle>
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

        <ScrollArea className="flex-1 px-6">
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
                      onClick={() => removeEducation(edu.id)}
                      className="absolute top-2 right-2 rounded-full p-1 hover:bg-muted text-muted-foreground"
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
              <div className="flex gap-2 mb-3">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill and press Enter"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addSkill} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-1 rounded-full p-0.5 hover:bg-muted">
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
                      onClick={() => removeExperience(exp.id)}
                      className="absolute top-3 right-3 rounded-full p-1 hover:bg-muted text-muted-foreground"
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
                      onClick={() => removeProject(proj.id)}
                      className="absolute top-3 right-3 rounded-full p-1 hover:bg-muted text-muted-foreground"
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
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleRemoveDoc(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
      </SheetContent>
    </Sheet>
  );
}
