# CoverCraft — Developer Guide

This guide covers the project structure, local development setup, API reference, and deployment process for CoverCraft.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack](#2-tech-stack)
3. [Local Development](#3-local-development)
4. [Environment Variables](#4-environment-variables)
5. [Architecture Overview](#5-architecture-overview)
6. [API Reference](#6-api-reference)
7. [LLM Service](#7-llm-service)
8. [Frontend Data Persistence](#8-frontend-data-persistence)
9. [Quality Checks](#9-quality-checks)
10. [Testing](#10-testing)
11. [Deploying to Vercel](#11-deploying-to-vercel)

---

## 1. Project Structure

```
Cover-Letter-Maker/
├── frontend/                        # React SPA (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   └── Index.tsx            # Main application page
│   │   ├── components/
│   │   │   ├── ProfileEditor.tsx    # Profile management sheet
│   │   │   ├── InstructionsEditor.tsx # Generation settings sheet
│   │   │   ├── HistoryPanel.tsx     # Saved letters sidebar
│   │   │   └── ui/                  # shadcn/ui component library
│   │   ├── lib/
│   │   │   ├── profile.ts           # Profile localStorage CRUD
│   │   │   ├── history.ts           # Letter history localStorage CRUD
│   │   │   ├── collections.ts       # Collections localStorage CRUD
│   │   │   ├── documents.ts         # Document library localStorage CRUD
│   │   │   ├── instructions.ts      # Settings localStorage CRUD
│   │   │   ├── pdf.ts               # PDF export (html2pdf.js)
│   │   │   ├── docx.ts              # DOCX export (docx library)
│   │   │   ├── fileTextExtractor.ts # Client-side PDF/DOCX/TXT extraction
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── profile.ts           # TypeScript interfaces
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
│
├── backend/                         # Express API
│   ├── src/
│   │   ├── index.ts                 # Express app setup and route mounting
│   │   ├── routes/
│   │   │   ├── coverLetter.ts       # POST /api/cover-letter
│   │   │   ├── job.ts               # /api/job/* endpoints
│   │   │   ├── profile.ts           # POST /api/profile/extract
│   │   │   └── documents.ts         # /api/documents/* endpoints
│   │   ├── services/
│   │   │   ├── llm.ts               # Groq SDK wrapper
│   │   │   ├── coverLetterGenerator.ts # Core generation logic
│   │   │   ├── jobParser.ts         # Job posting AI parsing
│   │   │   └── textExtractor.ts     # Server-side text extraction
│   │   ├── prompts/
│   │   │   ├── coverLetter.ts       # System prompt + user prompt builder
│   │   │   ├── jobParsing.ts        # Job parsing prompt
│   │   │   └── profileExtraction.ts # Profile extraction prompt
│   │   ├── validators/
│   │   │   └── coverLetter.ts       # Quality check functions
│   │   ├── types/
│   │   │   └── index.ts             # Shared types and Zod schemas
│   │   └── db/
│   │       └── documents.ts         # In-memory document store (legacy)
│   └── package.json
│
├── api/
│   └── index.ts                     # Vercel serverless entry point
│
├── vercel.json                      # Vercel deployment config
├── package.json                     # Root scripts
└── docs/
    ├── user-guide.md
    └── developer-guide.md
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18, TypeScript, Vite |
| UI components | shadcn/ui, Tailwind CSS, Radix UI |
| Routing | React Router v6 |
| Backend framework | Node.js, Express.js, TypeScript |
| AI provider | Groq (`llama-3.3-70b-versatile`) |
| Input validation | Zod |
| PDF extraction (client) | pdfjs-dist |
| DOCX extraction (client) | mammoth |
| PDF export | html2pdf.js |
| DOCX export | docx |
| Testing | vitest, @testing-library/react, supertest |
| Deployment | Vercel (static SPA + serverless function) |

---

## 3. Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- A [Groq API key](https://console.groq.com)

### Install

```bash
# From the repo root — installs all workspaces
npm install
```

### Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and set GROQ_API_KEY

# Frontend
cp frontend/.env.example frontend/.env
# frontend/.env already contains VITE_API_URL=http://localhost:3001
```

### Start development servers

```bash
npm run dev
```

This starts both servers concurrently:

| Server | URL |
|---|---|
| Frontend (Vite) | http://localhost:8080 |
| Backend (Express) | http://localhost:3001 |

### Build

```bash
npm run build
# Output: frontend/dist/  (static files served by Vercel)
```

---

## 4. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | — | Groq API key for LLM access |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model identifier |
| `PORT` | No | `3001` | Express server port |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Local only | Backend base URL. Set to `http://localhost:3001` locally. Leave unset on Vercel (uses relative `/api` paths). |

---

## 5. Architecture Overview

### Data flow

```
Browser
  │
  ├─ localStorage ──► profile, history, collections, documents, instructions
  │
  └─ fetch() calls
       │
       ├─ POST /api/job/parse       ──► jobParser.ts ──► Groq LLM
       ├─ POST /api/job/fetch       ──► fetch(url), stripHtml()
       ├─ POST /api/job/research    ──► Groq LLM
       ├─ POST /api/profile/extract ──► Groq LLM
       └─ POST /api/cover-letter    ──► coverLetterGenerator.ts ──► Groq LLM
```

### Key design decisions

- **No database.** All user data (profile, history, documents, collections) is stored in browser `localStorage`. The backend is stateless.
- **Client-side text extraction.** PDF/DOCX/TXT files are extracted entirely in the browser using `pdfjs-dist` and `mammoth`. Only the extracted text is sent to the server, never the file itself.
- **LLM retry loop.** Cover letter generation retries up to 2 times if dashes are detected in the output.
- **Vercel serverless.** The entire Express app is wrapped in `api/index.ts` and deployed as a single Vercel serverless function.

### localStorage keys

| Key | Content |
|---|---|
| `covercraft-profile` | `CandidateProfile` object |
| `covercraft-history` | Array of saved letter records (max 50) |
| `covercraft-collections` | Array of collection objects |
| `covercraft-documents` | Array of extracted document records |
| `covercraft-instructions` | Instructions/settings object |

---

## 6. API Reference

All endpoints are under `/api`. In local development the base URL is `http://localhost:3001`. On Vercel it is the site root.

---

### POST `/api/cover-letter`

Generate a cover letter.

**Request body**

```typescript
{
  candidate_profile: {
    name: string;
    location: string;
    phone: string;
    email: string;                       // validated email format
    linkedin_url?: string;
    website_url?: string;
    availability_default?: string;
    degree_year?: string;
    programme?: string;
    university?: string;
    skills: string[];
    experiences: {
      title: string;
      company: string;
      start_date: string;
      end_date?: string;
      description: string;
      outcomes?: string[];
    }[];
    projects?: {
      name: string;
      description: string;
      technologies?: string[];
      outcomes?: string[];
    }[];
  };
  job_posting: string;
  company_context?: string;
  tone?: "professional" | "confident" | "concise" | "story-driven" | "technical";
  priority_keywords?: string[];
  availability?: string;
  recipient_name?: string;
  recipient_title?: string;
  recipient_org?: string;
  recipient_location?: string;
  date?: string;
  document_texts?: { filename: string; text: string }[];
  system_prompt?: string;              // overrides default system prompt
}
```

**Response body**

```typescript
{
  cover_letter_text: string;
  extracted_fields: {
    role_title: string;
    company: string;
    recipient_line: string;
    key_requirements: string[];
    matched_experiences: string[];
    chosen_skills: string[];
    used_documents: string[];
  };
  quality_checks: {
    no_dashes: boolean;
    format_ok: boolean;
    length_ok: boolean;
    availability_mentioned: boolean;
    no_bullets: boolean;
  };
}
```

---

### POST `/api/job/fetch`

Fetch a job posting from a URL and return stripped plain text.

**Request body**

```typescript
{ url: string; }  // must be HTTP or HTTPS
```

**Response body**

```typescript
{
  url: string;
  title: string;
  text: string;     // HTML stripped, max 30,000 chars
  preview: string;  // first 500 chars
}
```

---

### POST `/api/job/parse`

Parse a raw job posting into structured fields using the LLM.

**Request body**

```typescript
{ job_posting: string; }
```

**Response body**

```typescript
{
  company_name: string;
  role_title: string;
  location: string;
  requirements: string[];  // up to 8
  keywords: string[];      // up to 10
}
```

---

### POST `/api/job/research`

Extract company context from job page text using the LLM.

**Request body**

```typescript
{
  text: string;           // min 120 chars, max 18,000
  company_name?: string;
}
```

**Response body**

```typescript
{
  company_summary: string;
  mission: string;
  values: string[];       // up to 6
  recent_news: string[];  // up to 5
}
```

---

### POST `/api/profile/extract`

Extract structured profile fields from resume text using the LLM.

**Request body**

```typescript
{ text: string; }  // min 20 chars, max 15,000
```

**Response body**

```typescript
{
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url?: string;
  website_url?: string;
  programme?: string;
  university?: string;
  degree_year?: string;
  skills: string[];
  experiences: {
    title: string;
    company: string;
    start_date: string;
    end_date?: string;
    description: string;
    outcomes?: string[];
  }[];
  projects?: {
    name: string;
    description: string;
    technologies?: string[];
    outcomes?: string[];
  }[];
}
```

---

### GET `/api/health`

Health check. Use this to verify a deployment is working.

**Response body**

```typescript
{
  status: "ok";
  timestamp: string;        // ISO 8601
  vercel: boolean;
  commit: string;           // git SHA
  groq_configured: boolean;
  groq_model: string;
}
```

---

### GET `/api/default-prompt`

Returns the default LLM system prompt used for cover letter generation.

**Response body**

```typescript
{ system_prompt: string; }
```

---

## 7. LLM Service

The LLM service lives in `backend/src/services/llm.ts` and wraps the Groq SDK.

```typescript
chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string>
```

| Option | Default | Used for |
|---|---|---|
| `temperature` | `0.7` | Cover letter generation (balanced creativity) |
| `temperature: 0.2` | — | Job parsing, profile extraction, company research (factual, deterministic) |
| `maxTokens` | `2048` | Cover letter generation |
| `maxTokens: 1024` | — | Job parsing |
| `maxTokens: 4096` | — | Profile extraction |
| `maxTokens: 900` | — | Company research |

### Generation pipeline (`coverLetterGenerator.ts`)

1. Assemble document context from uploaded file texts
2. Call `parseJobPosting()` — extracts company, role, requirements, keywords via LLM
3. Build the user prompt (profile + parsed job + raw posting + documents + formatting instructions)
4. Call `chatCompletion()` with system prompt + user prompt
5. Run `postProcess()` on the output:
   - Strip markdown code fences
   - Replace all dash variants (`-`, `–`, `—`) with commas or spaces
   - Convert bullet lines to inline text
   - Normalise multiple blank lines
6. If dashes are still present, retry from step 4 (up to 2 retries)
7. Run `runQualityChecks()` and return the result

### Modifying the system prompt

The default system prompt is defined in `backend/src/prompts/coverLetter.ts`. It enforces:

- Strict block layout (header, date, recipient, salutation, 4 paragraphs, sign-off)
- No dashes, no bullets
- 280–380 words
- Availability date in opening paragraph
- No invented facts

Users can override the system prompt per-generation via the Instructions editor (sent as `system_prompt` in the request body).

---

## 8. Frontend Data Persistence

All persistence is via `localStorage`. Each `lib/*.ts` module owns one key and exposes typed CRUD functions. There is no global state manager — components call these functions directly and set local React state.

**History** is capped at 50 entries. When the limit is reached, the oldest entry is automatically removed.

**Documents** store only the extracted text, not the original binary file.

---

## 9. Quality Checks

`backend/src/validators/coverLetter.ts` exports `runQualityChecks()`, which returns a `QualityChecks` object:

| Check | Logic |
|---|---|
| `no_dashes` | Regex test for `-`, `–`, `—` |
| `no_bullets` | Regex test for lines starting with `*`, `•`, or `\d+.` |
| `format_ok` | Checks for ≥6 non-empty blocks, presence of "Dear", "Sincerely" |
| `length_ok` | Word count between 280 and 380 |
| `availability_mentioned` | Case-insensitive search for the availability string |

Quality checks are informational only — a failed check does not block the response or prevent export.

---

## 10. Testing

```bash
# Backend unit tests
npm run test:backend

# Frontend unit tests (from frontend/)
cd frontend && npm run test
```

The backend uses **vitest** with **supertest** for API integration tests. The frontend uses **vitest** with **@testing-library/react** and a **jsdom** environment.

---

## 11. Deploying to Vercel

### First deployment

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. **Do not change the Root Directory** — leave it as the repo root
4. Add environment variables in the Vercel project settings:
   - `GROQ_API_KEY` — your Groq API key
   - `GROQ_MODEL` — `llama-3.3-70b-versatile` (optional)
5. Click **Deploy**

### How Vercel handles the project

- `npm run build` runs from the repo root, building the frontend into `frontend/dist/`
- `api/index.ts` is deployed as a single serverless function
- `vercel.json` rewrites `/api/*` to the serverless function and all other paths to `index.html`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ]
}
```

### Verifying a deployment

```bash
curl https://<your-domain>/api/health
```

Expected response:

```json
{
  "status": "ok",
  "groq_configured": true,
  "groq_model": "llama-3.3-70b-versatile"
}
```

### Serverless function limits

Vercel's default serverless function timeout is 10 seconds (hobby) or 60 seconds (pro). Cover letter generation can take 15–25 seconds. The `api/index.ts` entry point sets a `maxDuration` to accommodate this — ensure your Vercel plan supports the configured duration.
