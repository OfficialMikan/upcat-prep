// ─── Multi-Provider AI Types ───────────────────────────────────────────────

export type AIProvider = 'gemini' | 'groq' | 'openai'

export interface ModelOption {
  id: string              // model identifier sent to the API
  label: string           // human-readable name shown in UI
  provider: AIProvider
  speedTier: 'fast' | 'balanced' | 'quality'
  supportsJsonSchema: boolean   // true = use strict structured output mode
  contextNote?: string    // small UI hint, e.g. "Best for math accuracy"
}

// Curated model catalogue. Kept small and current — only models worth
// offering, not an exhaustive dump of every provider SKU.
export const MODEL_CATALOGUE: ModelOption[] = [
  // Gemini
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini', speedTier: 'balanced', supportsJsonSchema: true, contextNote: 'Default — good balance of speed & quality' },
  { id: 'gemini-2.5-flash-lite-preview-06-17', label: 'Gemini 2.5 Flash-Lite', provider: 'gemini', speedTier: 'fast', supportsJsonSchema: true, contextNote: 'Fastest, used for chat & flashcards' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini', speedTier: 'quality', supportsJsonSchema: true, contextNote: 'Highest quality, slower & lower rate limit' },
  // Groq
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)', provider: 'groq', speedTier: 'fast', supportsJsonSchema: true, contextNote: 'Extremely fast inference via Groq LPUs' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Groq)', provider: 'groq', speedTier: 'fast', supportsJsonSchema: true, contextNote: 'Smaller & even faster, good for flashcards/chat' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Groq)', provider: 'groq', speedTier: 'fast', supportsJsonSchema: false, contextNote: 'Large context window' },
  // OpenAI
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai', speedTier: 'balanced', supportsJsonSchema: true, contextNote: 'Cheap, fast, strong structured output' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', speedTier: 'quality', supportsJsonSchema: true, contextNote: 'Highest quality, more expensive' },
]

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Google Gemini',
  groq: 'Groq',
  openai: 'OpenAI (ChatGPT)',
}

export const PROVIDER_KEY_HELP: Record<AIProvider, { url: string; label: string }> = {
  gemini: { url: 'https://aistudio.google.com/app/apikey', label: 'Google AI Studio' },
  groq: { url: 'https://console.groq.com/keys', label: 'Groq Console' },
  openai: { url: 'https://platform.openai.com/api-keys', label: 'OpenAI Platform' },
}

export interface AISettings {
  provider: AIProvider
  model: string          // model id from MODEL_CATALOGUE
  liteModel?: string     // optional faster fallback model id, same provider
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  liteModel: 'gemini-2.5-flash-lite-preview-06-17',
}

// ─── Generic chat-completion request/response shape used internally ──────
// Each provider adapter translates to/from this shape so the rest of the
// app (gemini.ts callers, API routes) doesn't need to know which backend
// is actually serving the request.

export interface AICompletionOptions {
  system?: string
  temperature?: number
  maxTokens?: number
  schema?: Record<string, unknown>   // JSON schema for structured output, if supported
  isBatch?: boolean
}

export interface AICompletionResult {
  text: string
  truncated: boolean
  provider: AIProvider
  model: string
}
