# CoverCraft

AI-powered cover letter generator. Paste a job posting, and the AI writes a professional, personalized cover letter using your saved profile.

## Tech Stack

| Layer    | Stack                                         |
|----------|-----------------------------------------------|
| Frontend | React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| Backend  | Express.js, TypeScript, Groq SDK (Llama 3.3 70B)    |
| Deploy   | Vercel (frontend static + backend serverless)        |

## Project Structure

```
├── frontend/          React SPA (Vite)
├── backend/           Express API
├── api/               Vercel serverless entry point
├── vercel.json        Vercel deployment config
└── package.json       Root scripts (dev, build, test)
```

## Local Development

```bash
# 1. Install dependencies
npm install
npm run install:all

# 2. Set up environment
#    Backend: copy backend/.env and add your GROQ_API_KEY
#    Frontend: frontend/.env already has VITE_API_URL=http://localhost:3001

# 3. Start both servers
npm run dev
```

- Frontend: http://localhost:8080
- Backend:  http://localhost:3001

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. **Do NOT change** the Root Directory (keep it as the repo root)
4. Add environment variables in Vercel project settings:
   - `GROQ_API_KEY` = your Groq API key
   - `GROQ_MODEL` = `llama-3.3-70b-versatile` (optional, this is the default)
5. Deploy

Vercel will:
- Build the frontend from `frontend/` (static files)
- Deploy `api/index.ts` as a serverless function (Express backend)
- Route `/api/*` to the serverless function
- Route everything else to the SPA

## API Endpoints

| Method | Path                   | Purpose                                |
|--------|------------------------|----------------------------------------|
| POST   | /api/cover-letter      | Generate cover letter                  |
| POST   | /api/documents/upload  | Upload file (PDF/DOCX/TXT)             |
| GET    | /api/documents         | List uploaded documents                |
| GET    | /api/documents/:id     | Get document with extracted text       |
| POST   | /api/profile/extract   | Extract profile from document text     |
| GET    | /api/default-prompt    | Get the default AI system prompt       |
| GET    | /api/health            | Health check                           |

## Features

- **Profile Editor** — save your personal info, education, skills, experiences, projects
- **Resume Auto-fill** — upload a resume to auto-populate your profile
- **Document Library** — upload portfolios, transcripts, etc. for AI reference
- **Custom AI Prompt** — view and edit the system prompt that controls generation
- **Collections** — organize generated letters into collections
- **Dark Mode** — toggle between light and dark themes
- **Export** — PDF, DOCX, TXT, or copy to clipboard
- **Edit Output** — edit the generated letter before exporting
