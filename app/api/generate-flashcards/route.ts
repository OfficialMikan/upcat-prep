import { NextRequest, NextResponse } from 'next/server'
import { generateFlashcards } from '@/lib/gemini'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { subject: Subject; subtopic: string; topic: string; count?: number; useLite?: boolean }
    const { subject, subtopic, topic, count = 8, useLite = true } = body
    if (!subject || !topic) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const cards = await generateFlashcards(subject, subtopic, topic, Math.min(count, 10), useLite)
    return NextResponse.json({ cards })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('RATE_LIMIT:')) {
      const waitMatch = message.match(/retry in (\d+\.?\d*)/i)
      return NextResponse.json({ error: 'rate_limit', waitSecs: waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : 60 }, { status: 429 })
    }
    if (message === 'SAFETY_BLOCK') return NextResponse.json({ error: 'safety_block' }, { status: 422 })
    console.error('[generate-flashcards]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
