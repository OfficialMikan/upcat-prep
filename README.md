# UPCAT PREP — AI-Powered Reviewer

A production-grade Next.js app for UPCAT (University of the Philippines College Admission Test) preparation. Pick your own AI provider (Gemini, Groq, or OpenAI), get structured-output question generation, Supabase persistence, and bilingual (English/Filipino) support.

## Features

- **Multi-Provider AI** — Choose Gemini, Groq, or OpenAI per session in Setup; pick from a curated model list per provider
- **Robust JSON Repair** — Automatically detects and repairs truncated/malformed AI responses (the "Unterminated string in JSON" class of bug) instead of crashing, with one automatic retry at reduced scope before failing
- **Database-First Caching** — Checks Supabase before generating; saves every new question for instant reuse
- **Pre-fetching** — Next question generates in the background while you answer the current one
- **Auto Fallback** — On rate limits, automatically switches to a faster model and retries
- **Mock UPCAT Exam** — 180 questions, 4 subjects, strict 3-hour timer with pause/resume
- **Spaced Repetition** — SM-2 algorithm surfaces weak topics at the right interval
- **Flashcard Mode** — AI-generated cards with Easy/Medium/Hard self-rating
- **Custom Question Upload** — PDF (via pdf.js), TXT, or pasted content -> AI extracts/generates questions
- **AI Tutor Chatbot** — Context-aware sidebar chat tied to the current question
- **Bilingual Content** — Math/Science always English; Reading/Language alternate English/Filipino
- **Step-by-Step Math Solutions** — Numbered explanations rendered with KaTeX
- **UPG Grading** — Real weighted formula (Math 20%, Science 20%, Reading 30%, Language 30%)
- **Dashboard** — Subject accuracy, UPG trend, weak topics, SR queue, full session history
- **How It Works page** (`/about`) — Onboarding explainer for first-time users
- **Dark/Light Mode** — System-wide theme toggle
- **Live Score HUD** — Real-time Correct/Wrong counter during sessions
- **Accessibility** — WCAG AA color contrast, `<main>` landmarks on every page, visible focus rings, accessible names on icon-only controls, a non-blocking confirm dialog (replacing `window.confirm()`, which froze the UI thread)

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Database | Supabase (PostgreSQL) |
| AI | Gemini 2.5 / Groq (Llama, Mixtral) / OpenAI (GPT-4o) |
| Math rendering | KaTeX via react-katex |
| Charts | Recharts |
| PDF extraction | pdf.js (Mozilla) |
| TTS | Web Speech API (English + Filipino voices) |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Get at least one AI provider API key
You only need **one** of these to start — pick whichever you prefer:

| Provider | Get a key at |
|---|---|
| Gemini | https://aistudio.google.com/app/apikey |
| Groq | https://console.groq.com/keys |
| OpenAI | https://platform.openai.com/api-keys |

### 3. Set up Supabase
1. Create a free project at https://supabase.com
2. Open the SQL Editor and run `supabase/schema.sql`
3. Copy your Project URL and anon key from Project Settings -> API

### 4. Configure environment variables
Copy `.env.example` to `.env.local` and fill in whichever provider(s) you have keys for:
```env
GEMINI_API_KEY=AIzaSyYOUR_KEY_HERE
GROQ_API_KEY=gsk_YOUR_KEY_HERE
OPENAI_API_KEY=sk-YOUR_KEY_HERE

NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Run locally
```bash
npm run dev
```
Open http://localhost:3000. Visit **Setup** (gear icon) to pick your provider/model and test the connection. Visit **How It Works** (ℹ️ icon) for a guided tour.

## Deploy

**Vercel (recommended for Next.js):**
```bash
npx vercel
```
Add your environment variables in the Vercel dashboard under Project Settings -> Environment Variables, then redeploy.

**Netlify:**
Push to GitHub -> Import in Netlify -> add the same env vars -> deploy.

## Project Structure

```
app/
  page.tsx                  -> Home (mode + subject selection)
  about/page.tsx            -> How It Works / onboarding explainer
  (quiz)/practice/page.tsx  -> Practice/spaced/custom quiz engine
  (quiz)/mock/page.tsx      -> 180Q mock exam with timer
  (quiz)/results/page.tsx   -> Post-session results & charts
  dashboard/page.tsx        -> Analytics dashboard
  flashcards/page.tsx       -> Flashcard mode
  custom/page.tsx           -> Upload/paste custom questions
  reference/page.tsx        -> AI-generated quick reference guides
  setup/page.tsx            -> Provider/model picker & connection testing
  api/
    generate-question/      -> Single + batch question generation (DB-first)
    generate-flashcards/    -> Flashcard batch generation
    chat/                   -> AI tutor chat
    extract-pdf/            -> Extract/generate questions from text
    reference/              -> Reference guide generation
    ai-status/              -> Reports which providers have keys configured
components/
  quiz/                     -> QuestionCard, Timer, LiveScoreHUD
  chat/                     -> ChatbotSidebar
  ui/                       -> MathRenderer (KaTeX), ConfirmDialog
  layout/                   -> Header
  pages/                    -> HomePage (re-exported by app/page.tsx)
lib/
  ai/
    providers.ts            -> Provider adapters (Gemini/Groq/OpenAI) + JSON repair
    content.ts               -> Provider-agnostic question/flashcard/chat/reference generation
    settings.ts               -> Server-side provider/model resolution + key status
  supabase.ts                -> All Supabase queries
store/
  quizStore.ts               -> Zustand session state
  aiSettingsStore.ts          -> Persisted provider/model preference
data/
  topics.ts                  -> Full UPCAT syllabus (4 subjects, 30+ subtopics, 300+ topics)
supabase/
  schema.sql                  -> Database schema (run this first)
```

## How the AI Pipeline Works

1. User starts a session -> `getNextContext()` picks a subject/subtopic/topic
2. Client calls `/api/generate-question` with the user's chosen provider/model
3. Server checks Supabase cache first (`getQuestionFromDB`)
4. If no cache hit, calls the selected provider via a shared adapter interface (`callAI`/`callAIJSON` in `lib/ai/providers.ts`)
5. The response is parsed with `safeParseJSON`, which repairs common truncation patterns (unterminated strings, dangling array elements) before falling back to a single retry at reduced scope
6. Saves the new question to Supabase in the background (non-blocking)
7. Meanwhile, the client has already pre-fetched 2 more questions for instant next-clicks
8. On a 429 (rate limit), the server reports `waitSecs` back to the client, which auto-retries and switches to a faster model

## Accessibility Notes

- All page text colors meet WCAG AA contrast (4.5:1+) in both light and dark themes
- Every page has exactly one `<main id="main-content">` landmark; a skip-link is provided in the root layout
- All icon-only buttons have `aria-label`; decorative icons are `aria-hidden`
- Choice buttons use `role="radiogroup"`/`role="radio"` with `aria-checked`, plus a visually-hidden live-region announcement of the result (not just color)
- Focus-visible rings are applied globally via CSS, separate from inline component styles that could otherwise swallow the default outline
- `window.confirm()` (which blocks the main thread) is replaced everywhere with an accessible, non-blocking `<ConfirmDialog>` that traps focus and supports Escape-to-cancel

## Known Limitations

- Free tiers vary by provider — the app auto-switches to a faster/cheaper model on rate limits, but heavy use within a minute may still hit limits occasionally
- PDF extraction via pdf.js works best on text-based PDFs; scanned/image-only PDFs won't extract text
- Supabase RLS policies in `schema.sql` allow public read/write (single-user app assumption) -- add `user_id` + auth if you extend this to multiple users
- Not every provider/model enforces JSON schemas natively (Groq's Mixtral, for example) -- those fall back to a prompt-embedded schema instruction, which is slightly less reliable than native structured output
