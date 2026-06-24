import { NextRequest, NextResponse } from 'next/server'
import { extractQuestionsFromText } from '@/lib/ai/content'
import { resolveAISettings } from '@/lib/ai/settings'
import { MODEL_CATALOGUE } from '@/types/providers'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text: string; subject: Subject; count?: number; mode?: 'extract' | 'generate'; provider?: string; model?: string }
    const { text, subject, count = 10, mode = 'extract', provider, model } = body
    if (!text || !subject) return NextResponse.json({ error: 'Missing text or subject' }, { status: 400 })
    if (text.length < 20) return NextResponse.json({ error: 'Text too short to extract questions from' }, { status: 400 })

    const resolved = resolveAISettings({ provider, model })
    const activeModel = resolved.liteModel
    const activeProvider = resolved.liteProvider
    const supportsJsonSchema = MODEL_CATALOGUE.find(m => m.id === activeModel)?.supportsJsonSchema ?? true

    const questions = await extractQuestionsFromText(text, subject, Math.min(count, 20), mode, { provider: activeProvider, model: activeModel, supportsJsonSchema })
    return NextResponse.json({ questions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('RATE_LIMIT:')) return NextResponse.json({ error: 'rate_limit' }, { status: 429 })
    if (message.startsWith('NO_KEY:')) return NextResponse.json({ error: 'no_key', message: message.replace('NO_KEY:', '') }, { status: 401 })
    console.error('[extract-pdf]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
