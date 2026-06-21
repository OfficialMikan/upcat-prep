# UPCAT PREP — AI-Powered Reviewer

A production-grade Next.js app for UPCAT (University of the Philippines College Admission Test) preparation, powered by Gemini AI with structured outputs, Supabase persistence, and bilingual (English/Filipino) support.

## ✨ Features

- **AI Question Generation** — Gemini 2.5 Flash with structured JSON schema output (no more parsing crashes)
- **Database-First Caching** — Checks Supabase before generating; saves every new question for instant reuse
- **Pre-fetching** — Next question generates in the background while you answer the current one
- **Auto Fallback to Flash-Lite** — On rate limits, automatically switches models and retries
- **Mock UPCAT Exam** — 180 questions, 4 subjects, strict 3-hour timer with pause/resume
- **Spaced Repetition** — SM-2 algorithm surfaces weak topics at the right interval
- **Flashcard Mode** — AI-generated cards with Easy/Medium/Hard self-rating
- **Custom Question Upload** — PDF (via pdf.js), TXT, or pasted content -> AI extracts/generates questions
- **AI Tutor Chatbot** — Context-aware sidebar chat tied to the current question
- **Bilingual Content** — Math/Science always English; Reading/Language alternate English/Filipino
- **Step-by-Step Math Solutions** — Numbered explanations rendered with KaTeX
- **UPG Grading** — Real weighted formula (Math 20%, Science 20%, Reading 30%, Language 30%)
- **Dashboard** — Subject accuracy, UPG trend, weak topics, SR queue, full session history
- **Dark/Light Mode** — System-wide theme toggle
- **Live Score HUD** — Real-time Correct/Wrong counter during sessions

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Database | Supabase (PostgreSQL) |
| AI | Gemini 2.5 Flash / Flash-Lite (structured outputs) |
| Math rendering | KaTeX via react-katex |
| Charts | Recharts |
| PDF extraction | pdf.js (Mozilla) |
| TTS | Web Speech API (English + Filipino voices) |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Get a Gemini API key
Go to https://aistudio.google.com/app/apikey -> Create API Key.

### 3. Set up Supabase
1. Create a free project at https://supabase.com
2. Open the SQL Editor and run `supabase/schema.sql`
3. Copy your Project URL and anon key from Project Settings -> API

### 4. Configure environment variables
Copy `.env.example` to `.env.local` and fill in:
```env
GEMINI_API_KEY=AIzaSyYOUR_KEY_HERE
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Run locally
```bash
npm run dev
```
Open http://localhost:3000. Visit Setup (gear icon) to test your connection.

## Deploy

**Vercel (recommended for Next.js):**
```bash
npx vercel
```
Add the three environment variables in the Vercel dashboard under Project Settings -> Environment Variables.

**Netlify:**
Push to GitHub -> Import in Netlify -> add the same env vars -> deploy.

## Project Structure

```
app/
  page.tsx                  -> Home (mode + subject selection)
  (quiz)/practice/page.tsx  -> Practice/spaced/custom quiz engine
  (quiz)/mock/page.tsx      -> 180Q mock exam with timer
  (quiz)/results/page.tsx  -> Post-session results & charts
  dashboard/page.tsx        -> Analytics dashboard
  flashcards/page.tsx       -> Flashcard mode
  custom/page.tsx           -> Upload/paste custom questions
  reference/page.tsx        -> AI-generated quick reference guides
  setup/page.tsx            -> API key & connection testing
  api/
    generate-question/      -> Single + batch question generation (DB-first)
    generate-flashcards/    -> Flashcard batch generation
    chat/                   -> AI tutor chat
    extract-pdf/            -> Extract/generate questions from text
    reference/              -> Reference guide generation
components/
  quiz/                     -> QuestionCard, Timer, LiveScoreHUD
  chat/                     -> ChatbotSidebar
  ui/                       -> MathRenderer (KaTeX)
  layout/                   -> Header
  pages/                    -> HomePage (re-exported by app/page.tsx)
lib/
  gemini.ts                 -> All Gemini API calls + structured schemas
  supabase.ts                -> All Supabase queries
store/
  quizStore.ts               -> Zustand session state
data/
  topics.ts                  -> Full UPCAT syllabus (4 subjects, 30+ subtopics, 300+ topics)
supabase/
  schema.sql                  -> Database schema (run this first)
```

## How the AI Pipeline Works

1. User starts a session -> `getNextContext()` picks a subject/subtopic/topic
2. Client calls `/api/generate-question`
3. Server checks Supabase cache first (`getQuestionFromDB`)
4. If no cache hit, calls Gemini with a JSON schema (`responseSchema`) -- guarantees valid structure
5. Saves the new question to Supabase in the background (non-blocking)
6. Meanwhile, the client has already pre-fetched 2 more questions for instant next-clicks
7. On a 429 (rate limit), the server reports `waitSecs` back to the client, which auto-retries and switches to Flash-Lite

## Known Limitations

- Free Gemini tier: 10 req/min (Flash) / 15 req/min (Flash-Lite), 1500 req/day -- the app manages this automatically but heavy use within a minute will still hit limits occasionally
- PDF extraction via pdf.js works best on text-based PDFs; scanned/image-only PDFs won't extract text
- Supabase RLS policies in `schema.sql` allow public read/write (single-user app assumption) -- add `user_id` + auth if you extend this to multiple users
