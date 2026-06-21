import { NextRequest, NextResponse } from 'next/server'
import { generateQuestion, generateBatch } from '@/lib/gemini'
import { getQuestionFromDB, saveQuestionToDB } from '@/lib/supabase'
import type { Subject, Difficulty } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      subject: Subject; subtopic: string; topic: string; difficulty: Difficulty
      batch?: number; skipCache?: boolean; useLite?: boolean
    }
    const { subject, subtopic, topic, difficulty, batch, skipCache, useLite } = body
    if (!subject || !topic) return NextResponse.json({ error: 'Missing subject or topic' }, { status: 400 })

    if (batch && batch > 1) {
      const questions = await generateBatch(subject, subtopic, topic, difficulty, Math.min(batch, 10), useLite)
      Promise.all(questions.map(q => saveQuestionToDB(q))).catch(() => {})
      return NextResponse.json({ questions })
    }

    if (!skipCache) {
      const cached = await getQuestionFromDB(subject, topic, subtopic)
      if (cached) {
        return NextResponse.json({ question: {
          id: cached.id, subject: cached.subject as Subject, subtopic: cached.subtopic, topic: cached.topic,
          difficulty: cached.difficulty as Difficulty, question: cached.question, choices: cached.choices,
          correct: cached.correct, explanation: cached.explanation, hint: cached.hint,
          hasVisual: cached.has_visual, visualType: cached.visual_type, visualData: cached.visual_data,
          language: cached.language, source: 'cached',
        }})
      }
    }

    const question = await generateQuestion(subject, subtopic, topic, difficulty, useLite)
    saveQuestionToDB(question).catch(() => {})
    return NextResponse.json({ question })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('RATE_LIMIT:')) {
      const waitMatch = message.match(/retry in (\d+\.?\d*)/i)
      const waitSecs = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : 60
      return NextResponse.json({ error: 'rate_limit', message: message.replace('RATE_LIMIT:', ''), waitSecs }, { status: 429 })
    }
    if (message === 'SAFETY_BLOCK') return NextResponse.json({ error: 'safety_block', message: 'Content blocked.' }, { status: 422 })
    if (message.startsWith('AUTH_ERROR:')) return NextResponse.json({ error: 'auth', message: 'Invalid API key.' }, { status: 401 })
    if (message.startsWith('BAD_REQUEST:')) return NextResponse.json({ error: 'bad_request', message }, { status: 400 })
    console.error('[generate-question]', message)
    return NextResponse.json({ error: 'generation_failed', message }, { status: 500 })
  }
}
