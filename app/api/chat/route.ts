import { NextRequest, NextResponse } from 'next/server'
import { chatWithTutor } from '@/lib/gemini'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      question: { question: string; choices: string[]; correct: number; explanation: string; subject: Subject; topic: string }
      userMessage: string; history: Array<{ role: string; content: string }>
    }
    const { question, userMessage, history } = body
    if (!question || !userMessage) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const reply = await chatWithTutor(question, userMessage, history || [], true)
    return NextResponse.json({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('RATE_LIMIT:')) {
      return NextResponse.json({ error: 'rate_limit', reply: "I'm a bit busy right now. Please try again in a moment!" }, { status: 429 })
    }
    console.error('[chat]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
