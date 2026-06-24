import type { Subject, Difficulty } from '@/types'
import type { AIProvider } from '@/types/providers'
import { callAIJSON, callAI } from './providers'

// ─── JSON Schemas (Gemini-style; ignored by providers that don't support them — they still get a "respond as JSON" instruction via prompt) ──
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
    properties: { front: { type: 'string' }, back: { type: 'string' }, language: { type: 'string', enum: ['en', 'fil'] } },
    required: ['front', 'back', 'language'],
  },
}
const BATCH_QUESTION_SCHEMA = { type: 'array', items: QUESTION_SCHEMA }
const REFERENCE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    sections: { type: 'array', items: { type: 'object', properties: { heading: { type: 'string' }, content: { type: 'string' } }, required: ['heading', 'content'] } },
  },
  required: ['title', 'sections'],
}

function buildSystemPrompt(subject: Subject, jsonInstructionNeeded: boolean): string {
  const isMathSci = subject === 'Math' || subject === 'Science'
  const isLangRead = subject === 'Reading' || subject === 'Language'
  return `You are an expert UPCAT question generator for Filipino high school students aiming for UP admission.
${jsonInstructionNeeded ? '\nRespond ONLY with valid JSON. No markdown fences, no commentary before or after the JSON.\n' : ''}
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

// Providers that don't natively support JSON schema enforcement still need
// an explicit instruction + the schema shape spelled out in the prompt.
function schemaHint(schema: Record<string, unknown>, supportsJsonSchema: boolean): string {
  if (supportsJsonSchema) return ''
  return `\n\nRespond with JSON matching this exact shape:\n${JSON.stringify(schema, null, 0)}`
}

interface GenOpts { provider: AIProvider; model: string; supportsJsonSchema: boolean }

export async function generateQuestion(subject: Subject, subtopic: string, topic: string, difficulty: Difficulty, opts: GenOpts) {
  const diffLabel = difficulty === 'Mixed' ? ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)] : difficulty
  const prompt = `Generate ONE ${diffLabel} UPCAT-style multiple-choice question.
Subject: ${subject} | Subtopic: ${subtopic} | Topic: ${topic}${schemaHint(QUESTION_SCHEMA, opts.supportsJsonSchema)}`
  const p = await callAIJSON<Record<string, unknown>>(prompt, opts.provider, opts.model, {
    system: buildSystemPrompt(subject, !opts.supportsJsonSchema),
    schema: opts.supportsJsonSchema ? QUESTION_SCHEMA : undefined,
    temperature: 0.85, maxTokens: 2048,
  })
  return normalizeQuestion(p, subject, subtopic, topic, difficulty)
}

export async function generateBatch(subject: Subject, subtopic: string, topic: string, difficulty: Difficulty, count: number, opts: GenOpts) {
  const prompt = `Generate ${count} different UPCAT-style multiple-choice questions.
Subject: ${subject} | Subtopic: ${subtopic} | Topic: ${topic}
Difficulty: ${difficulty === 'Mixed' ? 'vary between Easy, Medium, Hard' : difficulty}
Make each question unique.${schemaHint(BATCH_QUESTION_SCHEMA, opts.supportsJsonSchema)}`
  const arr = await callAIJSON<Record<string, unknown>[]>(prompt, opts.provider, opts.model, {
    system: buildSystemPrompt(subject, !opts.supportsJsonSchema),
    schema: opts.supportsJsonSchema ? BATCH_QUESTION_SCHEMA : undefined,
    temperature: 0.9, maxTokens: 8192, isBatch: true,
  })
  return arr.map(p => normalizeQuestion(p, subject, subtopic, topic, difficulty))
}

function normalizeQuestion(p: Record<string, unknown>, subject: Subject, subtopic: string, topic: string, difficulty: Difficulty) {
  return {
    subject, subtopic, topic,
    difficulty: (p.difficulty as Difficulty) || (difficulty === 'Mixed' ? 'Medium' : difficulty),
    question: (p.question as string) || '',
    choices: (p.choices as string[]) || [],
    correct: typeof p.correct === 'number' ? p.correct : 0,
    explanation: (p.explanation as string) || '',
    hint: (p.hint as string) || '',
    hasVisual: Boolean(p.hasVisual),
    visualType: (p.visualType as string) || undefined,
    visualData: (p.visualData as string) || undefined,
    language: (p.language as 'en' | 'fil') || 'en',
    source: 'ai' as const,
  }
}

export async function generateFlashcards(subject: Subject, subtopic: string, topic: string, count: number, opts: GenOpts) {
  const prompt = `Generate ${count} flashcards for UPCAT ${subject} study — ${subtopic}: ${topic}.
front = key concept/question, back = concise answer/formula. Use KaTeX for math. Vary difficulty.${schemaHint(FLASHCARD_SCHEMA, opts.supportsJsonSchema)}`
  return callAIJSON<Array<{ front: string; back: string; language: 'en' | 'fil' }>>(prompt, opts.provider, opts.model, {
    system: buildSystemPrompt(subject, !opts.supportsJsonSchema),
    schema: opts.supportsJsonSchema ? FLASHCARD_SCHEMA : undefined,
    temperature: 0.7, maxTokens: 4096, isBatch: true,
  })
}

export async function chatWithTutor(
  question: { question: string; choices: string[]; correct: number; explanation: string; subject: Subject; topic: string },
  userMessage: string, history: Array<{ role: string; content: string }>, opts: GenOpts
) {
  const ctx = `Current Question Context:
Subject: ${question.subject} — ${question.topic}
Question: "${question.question}"
Correct Answer: ${String.fromCharCode(65 + question.correct)}. ${question.choices[question.correct]}
Explanation: ${question.explanation}
${question.subject === 'Math' || question.subject === 'Science' ? 'Show step-by-step work using KaTeX.' : ''}
Keep responses focused (2-4 sentences). If the student writes in Filipino, respond in Filipino.`
  const msgs = history.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')
  const prompt = `${msgs ? msgs + '\n' : ''}Student: ${userMessage}`
  const result = await callAI(prompt, opts.provider, opts.model, { system: ctx, temperature: 0.7, maxTokens: 512 })
  return result.text
}

export async function extractQuestionsFromText(text: string, subject: Subject, count: number, mode: 'extract' | 'generate', opts: GenOpts) {
  const action = mode === 'extract' ? `Extract up to ${count} multiple-choice questions from this content.` : `Generate ${count} multiple-choice questions based on this study material.`
  const prompt = `${action}\nSubject: ${subject}\nContent: ${text.slice(0, 4000)}\n\nUse UPCAT style. Use KaTeX for math.${schemaHint(BATCH_QUESTION_SCHEMA, opts.supportsJsonSchema)}`
  const arr = await callAIJSON<Record<string, unknown>[]>(prompt, opts.provider, opts.model, {
    schema: opts.supportsJsonSchema ? BATCH_QUESTION_SCHEMA : undefined,
    temperature: 0.6, maxTokens: 8192, isBatch: true,
  })
  return arr.map((p, i) => ({
    subject, subtopic: (p.subtopic as string) || subject, topic: (p.topic as string) || `Custom ${i + 1}`,
    difficulty: (p.difficulty as Difficulty) || 'Medium',
    question: (p.question as string) || '', choices: (p.choices as string[]) || [],
    correct: typeof p.correct === 'number' ? p.correct : 0,
    explanation: (p.explanation as string) || '', hint: (p.hint as string) || '',
    hasVisual: false, language: 'en' as const, source: 'custom' as const,
  }))
}

export async function generateReferenceGuide(subject: Subject, opts: GenOpts) {
  const prompt = `Create a comprehensive UPCAT Quick Reference Guide for ${subject}.
Use KaTeX for math. Include 7-9 sections covering major subtopics. Target Filipino high school students.${schemaHint(REFERENCE_SCHEMA, opts.supportsJsonSchema)}`
  return callAIJSON<{ title: string; sections: Array<{ heading: string; content: string }> }>(prompt, opts.provider, opts.model, {
    schema: opts.supportsJsonSchema ? REFERENCE_SCHEMA : undefined,
    temperature: 0.5, maxTokens: 4096,
  })
}
