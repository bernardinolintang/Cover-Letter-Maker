import type { CandidateProfile } from "@/types/profile";

const STORAGE_KEY = "covercraft-profile";

export const DEFAULT_PROFILE: CandidateProfile = {
  name: "",
  location: "",
  phone: "",
  email: "",
  linkedin_url: "",
  website_url: "",
  degree_year: "",
  programme: "",
  university: "",
  availability_default: "",
  skills: [],
  experiences: [],
  projects: [],
};

export function loadProfile(): CandidateProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: CandidateProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function isProfileComplete(profile: CandidateProfile): boolean {
  return !!(profile.name && profile.email && profile.location && profile.phone);
}
