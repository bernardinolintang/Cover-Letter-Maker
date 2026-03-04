# CoverCraft

AI-powered cover letter generator that produces professional, block-format cover letters from a candidate profile, job posting, and optional uploaded documents (resume, transcript, portfolio).

## Run From Root

You can now run everything from the project root without `cd`:

```sh
npm install
npm run install:all
npm run dev
```

This starts:
- Frontend at `http://localhost:8080`
- Backend at `http://localhost:3001`

Other root commands:

```sh
npm run dev:frontend
npm run dev:backend
npm run test:backend
npm run build:frontend
npm run build:backend
```

## Docker Compose

If you prefer Docker:

```sh
docker compose up --build
```

This runs:
- Frontend container at `http://localhost:8080`
- Backend container at `http://localhost:3001`

Stop containers:

```sh
docker compose down
```

## Project Structure

```
├── frontend/          React + Vite + shadcn/ui (Lovable)
│   ├── src/           Components, pages, hooks, lib
│   ├── public/        Static assets
│   ├── supabase/      Edge functions (legacy)
│   └── ...            Vite, Tailwind, TypeScript configs
│
├── backend/           Express + TypeScript API
│   ├── src/
│   │   ├── routes/        API endpoints
│   │   ├── services/      LLM, text extraction, generation
│   │   ├── validators/    Cover letter quality checks
│   │   ├── prompts/       System prompts for LLM
│   │   ├── db/            SQLite database layer
│   │   └── types/         Zod schemas + TypeScript types
│   └── tests/         Vitest test suite
│
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express, TypeScript, SQLite (better-sqlite3) |
| LLM | Groq API (Llama 3.3 70B Versatile) |
| File Parsing | pdf-parse (PDF), mammoth (DOCX), raw fs (TXT) |
| Validation | Zod (request schemas), custom validators (format, dashes, bullets) |
| Testing | Vitest, Supertest |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### 1. Backend

```sh
cd backend
npm install

# Create .env with your Groq API key
# GROQ_API_KEY=gsk_...
# GROQ_MODEL=llama-3.3-70b-versatile
# PORT=3001

npm run dev
```

The API runs at `http://localhost:3001`.

### 2. Frontend

```sh
cd frontend
npm install

# .env should contain VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

The frontend runs at `http://localhost:8080`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents/upload` | Upload a file (PDF, DOCX, TXT) with automatic text extraction |
| `GET` | `/api/documents` | List all uploaded documents |
| `GET` | `/api/documents/:id` | Get document metadata and extracted text |
| `POST` | `/api/cover-letter` | Generate a cover letter |
| `GET` | `/api/health` | Health check |

### Cover Letter Request

```json
{
  "candidate_profile": {
    "name": "Jane Doe",
    "location": "Toronto, Ontario",
    "phone": "(416) 555-0199",
    "email": "jane@example.com",
    "linkedin_url": "https://linkedin.com/in/janedoe",
    "skills": ["Python", "React", "SQL"],
    "experiences": [
      {
        "title": "Product Intern",
        "company": "TechStart Inc.",
        "start_date": "May 2024",
        "end_date": "August 2024",
        "description": "Led onboarding redesign.",
        "outcomes": ["Reduced drop-off by 22%"]
      }
    ]
  },
  "job_posting": "Product Manager at Acme Corp...",
  "document_ids": ["optional-uploaded-doc-id"]
}
```

### Cover Letter Response

Returns `cover_letter_text`, `extracted_fields` (role, company, matched experiences, chosen skills), and `quality_checks` (no dashes, no bullets, format ok, word count ok, availability mentioned).

## Cover Letter Format Rules

- Strict block layout: header, date, recipient, salutation, 3-4 body paragraphs, sign-off
- No dashes (hyphens, en-dashes, em-dashes) anywhere
- No bullet points or numbered lists
- 280 to 380 words
- Availability dates mentioned in opening paragraph
- American spelling, confident and product-oriented tone

## Running Tests

```sh
cd backend
npm test        # 36 tests across validators, generation, and upload
```

## License

Private project.
