import { NextRequest, NextResponse } from 'next/server'
import { extractQuestionsFromText } from '@/lib/gemini'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text: string; subject: Subject; count?: number; mode?: 'extract' | 'generate' }
    const { text, subject, count = 10, mode = 'extract' } = body
    if (!text || !subject) return NextResponse.json({ error: 'Missing text or subject' }, { status: 400 })
    if (text.length < 20) return NextResponse.json({ error: 'Text too short to extract questions from' }, { status: 400 })
    const questions = await extractQuestionsFromText(text, subject, Math.min(count, 20), mode, true)
    return NextResponse.json({ questions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('RATE_LIMIT:')) return NextResponse.json({ error: 'rate_limit' }, { status: 429 })
    console.error('[extract-pdf]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
