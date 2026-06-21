import type { Subject, Difficulty } from '@/types'

const MODELS = { flash: 'gemini-2.5-flash', flashLite: 'gemini-2.5-flash-lite-preview-06-17' } as const
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    choices: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
    correct: { type: 'integer' },
    explanation: { type: 'string' },
    hint: { type: 'string' },
    difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
    language: { type: 'string', enum: ['en', 'fil'] },
    hasVisual: { type: 'boolean' },
    visualType: { type: 'string', enum: ['svg', 'chart', 'none'] },
    visualData: { type: 'string' },
  },
  required: ['question', 'choices', 'correct', 'explanation', 'hint', 'difficulty', 'language'],
}
const FLASHCARD_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      front: { type: 'string' }, back: { type: 'string' },
      language: { type: 'string', enum: ['en', 'fil'] },
    },
    required: ['front', 'back', 'language'],
  },
}
const BATCH_QUESTION_SCHEMA = { type: 'array', items: QUESTION_SCHEMA }

function buildSystemPrompt(subject: Subject): string {
  const isMathSci = subject === 'Math' || subject === 'Science'
  const isLangRead = subject === 'Reading' || subject === 'Language'
  return `You are an expert UPCAT question generator for Filipino high school students aiming for UP admission.

LANGUAGE RULES:
${isMathSci ? '- ALL content MUST be in ENGLISH. No Filipino/Tagalog words.' : ''}
${isLangRead ? '- Randomly alternate between English and Filipino/Tagalog (50/50). Set the "language" field accordingly.' : ''}

MATH/SCIENCE RULES:
- Format explanation as NUMBERED STEPS: "Step 1: ...\\nStep 2: ...\\n...Answer: ..."
- Use KaTeX syntax for ALL math: $...$ inline, $$...$$ display

QUALITY RULES:
- Match actual UPCAT difficulty and style
- All 4 choices distinct and plausible
- Hint guides without revealing the answer

VISUAL RULES:
- hasVisual: true only when a graph/diagram is genuinely needed (<20% of questions)
- visualData: JSON chart spec or clean SVG string`
}

interface GeminiOptions {
  schema?: Record<string, unknown>
  useLite?: boolean
  temperature?: number
  maxTokens?: number
  system?: string
  isBatch?: boolean
}

export async function callGemini(prompt: string, opts: GeminiOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment')
  const model = opts.useLite ? MODELS.flashLite : MODELS.flash
  const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.85,
      maxOutputTokens: opts.maxTokens ?? (opts.isBatch ? 8192 : 2048),
      topP: 0.9,
      ...(opts.schema ? { responseMimeType: 'application/json', responseSchema: opts.schema } : {}),
    },
  }
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }

  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } }
    const msg = err?.error?.message || `HTTP ${resp.status}`
    if (resp.status === 429) throw new Error(`RATE_LIMIT:${msg}`)
    if (resp.status === 400) throw new Error(`BAD_REQUEST:${msg}`)
    if (resp.status === 403) throw new Error(`AUTH_ERROR:${msg}`)
    throw new Error(msg)
  }
  const data = await resp.json() as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }> }
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No response from Gemini')
  if (candidate.finishReason === 'SAFETY') throw new Error('SAFETY_BLOCK')
  const text = candidate.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Empty response')
  return text
}

export async function generateQuestion(subject: Subject, subtopic: string, topic: string, difficulty: Difficulty, useLite = false) {
  const diffLabel = difficulty === 'Mixed' ? ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)] : difficulty
  const prompt = `Generate ONE ${diffLabel} UPCAT-style multiple-choice question.
Subject: ${subject} | Subtopic: ${subtopic} | Topic: ${topic}`
  const raw = await callGemini(prompt, { system: buildSystemPrompt(subject), schema: QUESTION_SCHEMA, useLite, temperature: 0.85, maxTokens: 2048 })
  const p = JSON.parse(raw) as Record<string, unknown>
  return {
    subject, subtopic, topic,
    difficulty: (p.difficulty as Difficulty) || (difficulty === 'Mixed' ? 'Medium' : difficulty),
    question: (p.question as string) || '', choices: (p.choices as string[]) || [],
    correct: typeof p.correct === 'number' ? p.correct : 0,
    explanation: (p.explanation as string) || '', hint: (p.hint as string) || '',
    hasVisual: Boolean(p.hasVisual), visualType: p.visualType as string || undefined,
    visualData: p.visualData as string || undefined, language: (p.language as 'en' | 'fil') || 'en',
    source: 'ai' as const,
  }
}

export async function generateBatch(subject: Subject, subtopic: string, topic: string, difficulty: Difficulty, count = 5, useLite = false) {
  const prompt = `Generate ${count} different UPCAT-style multiple-choice questions.
Subject: ${subject} | Subtopic: ${subtopic} | Topic: ${topic}
Difficulty: ${difficulty === 'Mixed' ? 'vary between Easy, Medium, Hard' : difficulty}
Make each question unique.`
  const raw = await callGemini(prompt, { system: buildSystemPrompt(subject), schema: BATCH_QUESTION_SCHEMA, useLite, temperature: 0.9, maxTokens: 8192, isBatch: true })
  const arr = JSON.parse(raw) as Record<string, unknown>[]
  return arr.map(p => ({
    subject, subtopic, topic,
    difficulty: (p.difficulty as Difficulty) || (difficulty === 'Mixed' ? 'Medium' : difficulty),
    question: (p.question as string) || '', choices: (p.choices as string[]) || [],
    correct: typeof p.correct === 'number' ? p.correct : 0,
    explanation: (p.explanation as string) || '', hint: (p.hint as string) || '',
    hasVisual: Boolean(p.hasVisual), visualType: p.visualType as string || undefined,
    visualData: p.visualData as string || undefined, language: (p.language as 'en' | 'fil') || 'en',
    source: 'ai' as const,
  }))
}

export async function generateFlashcards(subject: Subject, subtopic: string, topic: string, count = 8, useLite = false) {
  const prompt = `Generate ${count} flashcards for UPCAT ${subject} study — ${subtopic}: ${topic}.
front = key concept/question, back = concise answer/formula. Use KaTeX for math. Vary difficulty.`
  const raw = await callGemini(prompt, { system: buildSystemPrompt(subject), schema: FLASHCARD_SCHEMA, useLite, temperature: 0.7, maxTokens: 4096, isBatch: true })
  return JSON.parse(raw) as Array<{ front: string; back: string; language: 'en' | 'fil' }>
}

export async function chatWithTutor(
  question: { question: string; choices: string[]; correct: number; explanation: string; subject: Subject; topic: string },
  userMessage: string, history: Array<{ role: string; content: string }>, useLite = true
) {
  const ctx = `Current Question Context:
Subject: ${question.subject} — ${question.topic}
Question: "${question.question}"
Correct Answer: ${String.fromCharCode(65 + question.correct)}. ${question.choices[question.correct]}
Explanation: ${question.explanation}
${question.subject === 'Math' || question.subject === 'Science' ? 'Show step-by-step work using KaTeX.' : ''}
Keep responses focused (2-4 sentences). If the student writes in Filipino, respond in Filipino.`
  const msgs = history.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')
  const prompt = `${ctx}\n\n${msgs ? msgs + '\n' : ''}Student: ${userMessage}`
  return callGemini(prompt, { useLite, temperature: 0.7, maxTokens: 512 })
}

export async function extractQuestionsFromText(text: string, subject: Subject, count: number, mode: 'extract' | 'generate', useLite = true) {
  const action = mode === 'extract' ? `Extract up to ${count} multiple-choice questions from this content.` : `Generate ${count} multiple-choice questions based on this study material.`
  const prompt = `${action}\nSubject: ${subject}\nContent: ${text.slice(0, 4000)}\n\nUse UPCAT style. Use KaTeX for math.`
  const raw = await callGemini(prompt, { schema: BATCH_QUESTION_SCHEMA, useLite, temperature: 0.6, maxTokens: 8192, isBatch: true })
  const arr = JSON.parse(raw) as Record<string, unknown>[]
  return arr.map((p, i) => ({
    subject, subtopic: (p.subtopic as string) || subject, topic: (p.topic as string) || `Custom ${i + 1}`,
    difficulty: (p.difficulty as Difficulty) || 'Medium',
    question: (p.question as string) || '', choices: (p.choices as string[]) || [],
    correct: typeof p.correct === 'number' ? p.correct : 0,
    explanation: (p.explanation as string) || '', hint: (p.hint as string) || '',
    hasVisual: false, language: 'en' as const, source: 'custom' as const,
  }))
}

export async function generateReferenceGuide(subject: Subject, useLite = true) {
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      sections: { type: 'array', items: { type: 'object', properties: { heading: { type: 'string' }, content: { type: 'string' } }, required: ['heading', 'content'] } },
    },
    required: ['title', 'sections'],
  }
  const prompt = `Create a comprehensive UPCAT Quick Reference Guide for ${subject}.
Use KaTeX for math. Include 7-9 sections covering major subtopics. Target Filipino high school students.`
  const raw = await callGemini(prompt, { schema, useLite, temperature: 0.5, maxTokens: 4096 })
  return JSON.parse(raw) as { title: string; sections: Array<{ heading: string; content: string }> }
}
