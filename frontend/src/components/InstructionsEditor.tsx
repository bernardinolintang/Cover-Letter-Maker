import { useState, useEffect } from "react";
import { Settings, Save, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { GenerationInstructions } from "@/types/profile";
import { loadInstructions, saveInstructions } from "@/lib/instructions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface InstructionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstructionsSaved: (instructions: GenerationInstructions) => void;
}

export function InstructionsEditor({ open, onOpenChange, onInstructionsSaved }: InstructionsEditorProps) {
  const [instructions, setInstructions] = useState<GenerationInstructions>(loadInstructions);
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (open) {
      setInstructions(loadInstructions());
      fetchDefaultPrompt();
    }
  }, [open]);

  const fetchDefaultPrompt = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/default-prompt`);
      if (resp.ok) {
        const data = await resp.json();
        setDefaultPrompt(data.system_prompt);
      }
    } catch {
      // Silently fail; the textarea will just be empty
    }
  };

  const update = <K extends keyof GenerationInstructions>(key: K, value: string) => {
    setInstructions((i) => ({ ...i, [key]: value }));
  };

  const handleResetPrompt = () => {
    update("system_prompt", "");
    toast.success("Prompt reset to default.");
  };

  const handleSave = () => {
    saveInstructions(instructions);
    onInstructionsSaved(instructions);
    toast.success("Instructions saved!");
    onOpenChange(false);
  };

  const displayedPrompt = instructions.system_prompt || defaultPrompt;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Instructions
          </SheetTitle>
          <SheetDescription>
            Customize how each cover letter is generated. These settings are saved and reused until you change them.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* ── System Prompt ── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">AI System Prompt</h3>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="gap-1.5 text-xs h-7"
                  >
                    {showPrompt ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPrompt ? "Hide" : "View / Edit"}
                  </Button>
                  {instructions.system_prompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetPrompt}
                      className="gap-1.5 text-xs h-7 text-muted-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                This is the system prompt that controls how the AI writes your cover letter. You can view it and customize it.
                {instructions.system_prompt ? " You have a custom prompt saved." : " Currently using the default prompt."}
              </p>
              {showPrompt && (
                <div className="space-y-2">
                  <Textarea
                    value={displayedPrompt}
                    onChange={(e) => update("system_prompt", e.target.value)}
                    className="min-h-[280px] resize-y text-xs font-mono leading-relaxed bg-muted/50"
                    placeholder="Loading default prompt..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Edit above to customize. Leave blank or click Reset to revert to the default prompt.
                  </p>
                </div>
              )}
            </section>

            <Separator />

            {/* ── Availability Override ── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Availability</h3>
              <div>
                <Label htmlFor="inst-availability">Override availability (leave blank to use profile default)</Label>
                <Input
                  id="inst-availability"
                  value={instructions.availability || ""}
                  onChange={(e) => update("availability", e.target.value)}
                  placeholder="1 June 2026"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This overrides the default availability set in your profile for this generation.
                </p>
              </div>
            </section>

            <Separator />

            {/* ── Date Override ── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Letter Date</h3>
              <div>
                <Label htmlFor="inst-date">Custom date (leave blank for today)</Label>
                <Input
                  id="inst-date"
                  value={instructions.date || ""}
                  onChange={(e) => update("date", e.target.value)}
                  placeholder="4 March 2026"
                />
              </div>
            </section>

            <Separator />

            {/* ── Recipient ── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Recipient Details</h3>
              <p className="text-xs text-muted-foreground mb-3">
                If left blank, the letter will be addressed to "Hiring Team" and the company will be extracted from the job posting.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="inst-recipient-name">Recipient Name</Label>
                  <Input
                    id="inst-recipient-name"
                    value={instructions.recipient_name || ""}
                    onChange={(e) => update("recipient_name", e.target.value)}
                    placeholder="Ms. Sarah Chen"
                  />
                </div>
                <div>
                  <Label htmlFor="inst-recipient-title">Recipient Title</Label>
                  <Input
                    id="inst-recipient-title"
                    value={instructions.recipient_title || ""}
                    onChange={(e) => update("recipient_title", e.target.value)}
                    placeholder="Head of Engineering"
                  />
                </div>
                <div>
                  <Label htmlFor="inst-recipient-org">Company / Organization</Label>
                  <Input
                    id="inst-recipient-org"
                    value={instructions.recipient_org || ""}
                    onChange={(e) => update("recipient_org", e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="inst-recipient-location">Company Location</Label>
                  <Input
                    id="inst-recipient-location"
                    value={instructions.recipient_location || ""}
                    onChange={(e) => update("recipient_location", e.target.value)}
                    placeholder="Toronto, Ontario"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Company Context ── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Company Context</h3>
              <div>
                <Label htmlFor="inst-company-context">Additional context about the company</Label>
                <Textarea
                  id="inst-company-context"
                  value={instructions.company_context || ""}
                  onChange={(e) => update("company_context", e.target.value)}
                  placeholder="Acme Corp is a Series B fintech startup focused on democratizing access to financial tools for small businesses. They value speed, user empathy, and data driven decision making."
                  className="min-h-[100px] resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste company info, mission statement, or culture notes. The AI will weave this into the closing paragraph.
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="border-t border-border px-6 py-4">
          <Button onClick={handleSave} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="h-4 w-4" />
            Save Instructions
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
