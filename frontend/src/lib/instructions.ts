import type { GenerationInstructions } from "@/types/profile";

const STORAGE_KEY = "covercraft-instructions";

export const DEFAULT_INSTRUCTIONS: GenerationInstructions = {
  availability: "",
  recipient_name: "",
  recipient_title: "",
  recipient_org: "",
  recipient_location: "",
  company_context: "",
  date: "",
  system_prompt: "",
};

export function loadInstructions(): GenerationInstructions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INSTRUCTIONS };
    return { ...DEFAULT_INSTRUCTIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_INSTRUCTIONS };
  }
}

export function saveInstructions(instructions: GenerationInstructions): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instructions));
}
