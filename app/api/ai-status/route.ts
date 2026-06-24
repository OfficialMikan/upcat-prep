import { NextResponse } from 'next/server'
import { getKeyStatus } from '@/lib/ai/settings'
import { MODEL_CATALOGUE } from '@/types/providers'

export async function GET() {
  const keyStatus = getKeyStatus()
  return NextResponse.json({ keyStatus, models: MODEL_CATALOGUE })
}
