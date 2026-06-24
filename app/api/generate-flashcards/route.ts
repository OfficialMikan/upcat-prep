import { NextRequest, NextResponse } from 'next/server'
import { generateFlashcards } from '@/lib/ai/content'
import { resolveAISettings } from '@/lib/ai/settings'
import { MODEL_CATALOGUE } from '@/types/providers'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { subject: Subject; subtopic: string; topic: string; count?: number; useLite?: boolean; provider?: string; model?: string }
    const { subject, subtopic, topic, count = 8, useLite = true, provider, model } = body
    if (!subject || !topic) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const resolved = resolveAISettings({ provider, model })
    const activeModel = useLite ? resolved.liteModel : resolved.model
    const activeProvider = useLite ? resolved.liteProvider : resolved.provider
    const supportsJsonSchema = MODEL_CATALOGUE.find(m => m.id === activeModel)?.supportsJsonSchema ?? true

    const cards = await generateFlashcards(subject, subtopic, topic, Math.min(count, 10), { provider: activeProvider, model: activeModel, supportsJsonSchema })
    return NextResponse.json({ cards })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('RATE_LIMIT:')) {
      const waitMatch = message.match(/retry in (\d+\.?\d*)/i)
      return NextResponse.json({ error: 'rate_limit', waitSecs: waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : 60 }, { status: 429 })
    }
    if (message === 'SAFETY_BLOCK') return NextResponse.json({ error: 'safety_block' }, { status: 422 })
    if (message.startsWith('NO_KEY:')) return NextResponse.json({ error: 'no_key', message: message.replace('NO_KEY:', '') }, { status: 401 })
    console.error('[generate-flashcards]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
