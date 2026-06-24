import { NextRequest, NextResponse } from 'next/server'
import { generateReferenceGuide } from '@/lib/ai/content'
import { resolveAISettings } from '@/lib/ai/settings'
import { MODEL_CATALOGUE } from '@/types/providers'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { subject, provider, model } = await req.json() as { subject: Subject; provider?: string; model?: string }
    if (!subject) return NextResponse.json({ error: 'Missing subject' }, { status: 400 })

    const resolved = resolveAISettings({ provider, model })
    const activeModel = resolved.liteModel
    const activeProvider = resolved.liteProvider
    const supportsJsonSchema = MODEL_CATALOGUE.find(m => m.id === activeModel)?.supportsJsonSchema ?? true

    const guide = await generateReferenceGuide(subject, { provider: activeProvider, model: activeModel, supportsJsonSchema })
    return NextResponse.json({ guide })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.startsWith('NO_KEY:')) return NextResponse.json({ error: 'no_key', message: message.replace('NO_KEY:', '') }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
