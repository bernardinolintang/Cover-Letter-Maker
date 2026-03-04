import type { CandidateProfile, Education } from "@/types/profile";

const STORAGE_KEY = "covercraft-profile";

export const DEFAULT_PROFILE: CandidateProfile = {
  name: "",
  location: "",
  phone: "",
  email: "",
  linkedin_url: "",
  website_url: "",
  availability_default: "",
  skills: [],
  experiences: [],
  projects: [],
  education: [],
};

export function loadProfile(): CandidateProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const data = JSON.parse(raw);

    // Migrate legacy flat education fields → education array
    if (!data.education || !Array.isArray(data.education)) {
      const edu: Education[] = [];
      if (data.programme || data.university || data.degree_year) {
        edu.push({
          id: crypto.randomUUID(),
          programme: data.programme || "",
          university: data.university || "",
          degree_year: data.degree_year || "",
        });
      }
      data.education = edu;
      delete data.programme;
      delete data.university;
      delete data.degree_year;
    }

    return { ...DEFAULT_PROFILE, ...data };
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
