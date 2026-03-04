export interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date?: string;
  description: string;
  outcomes?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies?: string[];
  outcomes?: string[];
}

export interface CandidateProfile {
  name: string;
  degree_year?: string;
  programme?: string;
  university?: string;
  location: string;
  phone: string;
  email: string;
  linkedin_url?: string;
  website_url?: string;
  availability_default?: string;
  skills: string[];
  experiences: Experience[];
  projects: Project[];
}

export interface GenerationInstructions {
  availability?: string;
  recipient_name?: string;
  recipient_title?: string;
  recipient_org?: string;
  recipient_location?: string;
  company_context?: string;
  date?: string;
  system_prompt?: string;
}

export interface CoverLetterApiRequest {
  candidate_profile: Omit<CandidateProfile, "experiences" | "projects"> & {
    experiences: Omit<Experience, "id">[];
    projects?: Omit<Project, "id">[];
  };
  job_posting: string;
  company_context?: string;
  availability?: string;
  recipient_name?: string;
  recipient_title?: string;
  recipient_org?: string;
  recipient_location?: string;
  date?: string;
  document_ids?: string[];
  system_prompt?: string;
}

export interface ExtractedFields {
  role_title: string;
  company: string;
  recipient_line: string;
  key_requirements: string[];
  matched_experiences: string[];
  chosen_skills: string[];
  used_documents: string[];
}

export interface QualityChecks {
  no_dashes: boolean;
  format_ok: boolean;
  length_ok: boolean;
  availability_mentioned: boolean;
  no_bullets: boolean;
}

export interface CoverLetterApiResponse {
  cover_letter_text: string;
  extracted_fields: ExtractedFields;
  quality_checks: QualityChecks;
}
