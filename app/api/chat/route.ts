import { NextRequest, NextResponse } from 'next/server'
import { chatWithTutor } from '@/lib/ai/content'
import { resolveAISettings } from '@/lib/ai/settings'
import { MODEL_CATALOGUE } from '@/types/providers'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      question: { question: string; choices: string[]; correct: number; explanation: string; subject: Subject; topic: string }
      userMessage: string; history: Array<{ role: string; content: string }>
      provider?: string; model?: string
    }
    const { question, userMessage, history, provider, model } = body
    if (!question || !userMessage) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const resolved = resolveAISettings({ provider, model })
    const activeModel = resolved.liteModel
    const activeProvider = resolved.liteProvider
    const supportsJsonSchema = MODEL_CATALOGUE.find(m => m.id === activeModel)?.supportsJsonSchema ?? true

    const reply = await chatWithTutor(question, userMessage, history || [], { provider: activeProvider, model: activeModel, supportsJsonSchema })
    return NextResponse.json({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('RATE_LIMIT:')) {
      return NextResponse.json({ error: 'rate_limit', reply: "I'm a bit busy right now. Please try again in a moment!" }, { status: 429 })
    }
    if (message.startsWith('NO_KEY:')) {
      return NextResponse.json({ error: 'no_key', reply: 'AI tutor needs an API key configured in Setup before I can chat.' }, { status: 401 })
    }
    if (message.startsWith('AUTH_ERROR:')) {
      return NextResponse.json({ error: 'auth', reply: 'The configured API key looks invalid. Check Setup.' }, { status: 401 })
    }
    console.error('[chat]', message)
    return NextResponse.json({ error: message, reply: `⚠️ ${message}` }, { status: 500 })
  }
}
