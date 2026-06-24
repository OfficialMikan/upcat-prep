import type { AIProvider } from '@/types/providers'
import { MODEL_CATALOGUE, DEFAULT_AI_SETTINGS } from '@/types/providers'

export interface ResolvedAISettings {
  provider: AIProvider
  model: string
  liteModel: string
  liteProvider: AIProvider
}

/**
 * Resolves which provider/model to use for a request. Priority:
 * 1. Explicit provider/model passed in the request body (from user's Setup choice)
 * 2. Environment variable defaults (AI_PROVIDER / AI_MODEL)
 * 3. Hard-coded fallback (Gemini Flash)
 *
 * Falls back gracefully to Gemini if the requested provider has no API key
 * configured server-side, so a half-configured setup doesn't hard-fail.
 */
export function resolveAISettings(requested?: { provider?: string; model?: string }): ResolvedAISettings {
  let provider = (requested?.provider as AIProvider) || (process.env.AI_PROVIDER as AIProvider) || DEFAULT_AI_SETTINGS.provider
  let model = requested?.model || process.env.AI_MODEL || DEFAULT_AI_SETTINGS.model

  // Validate the provider has a key configured; if not, fall back to whichever does
  const keyMap: Record<AIProvider, string | undefined> = {
    gemini: process.env.GEMINI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  }

  if (!keyMap[provider]) {
    const fallback = (Object.entries(keyMap).find(([, key]) => !!key)?.[0] as AIProvider) || 'gemini'
    if (fallback !== provider) {
      console.warn(`[AI Settings] No API key for ${provider}, falling back to ${fallback}`)
      provider = fallback
      model = MODEL_CATALOGUE.find(m => m.provider === fallback)?.id || model
    }
  }

  // Determine a "lite" (fast/cheap) model for the same provider, for chat/flashcards
  const liteCandidate = MODEL_CATALOGUE.find(m => m.provider === provider && m.speedTier === 'fast')
  const liteModel = liteCandidate?.id || model
  const liteProvider = provider

  return { provider, model, liteModel, liteProvider }
}

export function getKeyStatus(): Record<AIProvider, boolean> {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  }
}
