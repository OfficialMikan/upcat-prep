import { NextRequest, NextResponse } from 'next/server'
import { generateReferenceGuide } from '@/lib/gemini'
import type { Subject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { subject } = await req.json() as { subject: Subject }
    if (!subject) return NextResponse.json({ error: 'Missing subject' }, { status: 400 })
    const guide = await generateReferenceGuide(subject, true)
    return NextResponse.json({ guide })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
