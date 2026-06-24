import type { AIProvider, AICompletionOptions, AICompletionResult } from '@/types/providers'

// ════════════════════════════════════════════════════════════════════════
// Robust JSON parsing with repair for truncated/malformed AI output.
// All providers occasionally truncate output mid-string when they hit
// the token budget. This repairs the common cases instead of throwing
// an uncaught "Unterminated string in JSON" error all the way to the UI.
// ════════════════════════════════════════════════════════════════════════
export function safeParseJSON<T = unknown>(raw: string): T {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    return JSON.parse(cleaned) as T
  } catch { /* fall through to repair */ }

  const repaired = repairTruncatedJSON(cleaned)
  try {
    return JSON.parse(repaired) as T
  } catch (err) {
    throw new Error(`Failed to parse AI response as JSON, even after repair. ${err instanceof Error ? err.message : String(err)}. Raw (first 300 chars): ${raw.slice(0, 300)}`)
  }
}

function repairTruncatedJSON(s: string): string {
  const firstChar = s.trimStart()[0]
  const isArray = firstChar === '['

  // Walk the string tracking string/escape state and a bracket depth stack.
  // We record `lastTopLevelBoundary`: the index right after the last comma
  // or closing bracket that occurred at depth 1 (i.e. directly inside the
  // outermost array/object) — this is the last point at which truncating
  // the string still yields a structurally complete top-level element.
  let inString = false
  let escapeNext = false
  const stack: string[] = []
  let lastTopLevelBoundary = -1

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inString) {
      if (escapeNext) { escapeNext = false; continue }
      if (ch === '\\') { escapeNext = true; continue }
      if (ch === '"') { inString = false }
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{' || ch === '[') {
      stack.push(ch)
    } else if (ch === '}' || ch === ']') {
      stack.pop()
      // Depth *after* popping: if we're now back at depth 1, this closing
      // bracket completed an element directly inside the top-level container.
      if (stack.length === 1) lastTopLevelBoundary = i + 1
    } else if (ch === ',' && stack.length === 1) {
      // A comma directly inside the top-level container also marks a safe
      // boundary (handles top-level objects like {"a":1,"b":2,).
      lastTopLevelBoundary = i
    }
  }

  let result = s

  // If we're still inside an unterminated string at end-of-input, the
  // current (incomplete) element is unsalvageable — fall back to the last
  // known-good top-level boundary rather than trying to close the string.
  const stillOpen = stack.length > 0
  if ((inString || stillOpen) && lastTopLevelBoundary > 0) {
    result = result.slice(0, lastTopLevelBoundary)
  } else if (inString) {
    // No earlier boundary to fall back to — best effort: close the string.
    result += '"'
  }

  // Remove trailing comma before we re-close containers.
  result = result.replace(/,\s*$/, '')

  // Recompute how many containers are still open in the (possibly trimmed) result.
  const reopenStack: string[] = []
  let reInString = false
  let reEscapeNext = false
  for (let i = 0; i < result.length; i++) {
    const ch = result[i]
    if (reInString) {
      if (reEscapeNext) { reEscapeNext = false; continue }
      if (ch === '\\') { reEscapeNext = true; continue }
      if (ch === '"') reInString = false
      continue
    }
    if (ch === '"') { reInString = true; continue }
    if (ch === '{' || ch === '[') reopenStack.push(ch)
    else if (ch === '}' || ch === ']') reopenStack.pop()
  }
  while (reopenStack.length > 0) {
    const open = reopenStack.pop()
    result += open === '{' ? '}' : ']'
  }

  if (!result.trim() || result.trim() === (isArray ? '[' : '{')) {
    return isArray ? '[]' : '{}'
  }
  return result
}

// ════════════════════════════════════════════════════════════════════════
// Provider adapters — each implements the same call signature.
// ════════════════════════════════════════════════════════════════════════

async function callGeminiAPI(prompt: string, model: string, opts: AICompletionOptions): Promise<AICompletionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('NO_KEY:Gemini API key not configured. Add GEMINI_API_KEY in Setup.')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.85,
      maxOutputTokens: opts.maxTokens ?? (opts.isBatch ? 8192 : 2048),
      topP: 0.9,
      ...(opts.schema ? { responseMimeType: 'application/json', responseSchema: opts.schema } : {}),
    },
  }
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }

  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } }
    const msg = err?.error?.message || `HTTP ${resp.status}`
    if (resp.status === 429) throw new Error(`RATE_LIMIT:${msg}`)
    if (resp.status === 400) throw new Error(`BAD_REQUEST:${msg}`)
    if (resp.status === 403) throw new Error(`AUTH_ERROR:${msg}`)
    throw new Error(msg)
  }
  const data = await resp.json() as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }> }
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No response from Gemini')
  if (candidate.finishReason === 'SAFETY') throw new Error('SAFETY_BLOCK')
  const text = candidate.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Empty response from Gemini')
  return { text, truncated: candidate.finishReason === 'MAX_TOKENS', provider: 'gemini', model }
}

async function callGroqAPI(prompt: string, model: string, opts: AICompletionOptions): Promise<AICompletionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('NO_KEY:Groq API key not configured. Add GROQ_API_KEY in Setup.')

  const messages: Array<{ role: string; content: string }> = []
  if (opts.system) messages.push({ role: 'system', content: opts.system })
  messages.push({ role: 'user', content: prompt })

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.85,
    max_tokens: opts.maxTokens ?? (opts.isBatch ? 8192 : 2048),
    ...(opts.schema ? { response_format: { type: 'json_object' } } : {}),
  }

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } }
    const msg = err?.error?.message || `HTTP ${resp.status}`
    if (resp.status === 429) throw new Error(`RATE_LIMIT:${msg}`)
    if (resp.status === 400) throw new Error(`BAD_REQUEST:${msg}`)
    if (resp.status === 401 || resp.status === 403) throw new Error(`AUTH_ERROR:${msg}`)
    throw new Error(msg)
  }
  const data = await resp.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> }
  const choice = data.choices?.[0]
  if (!choice) throw new Error('No response from Groq')
  const text = choice.message?.content || ''
  if (!text) throw new Error('Empty response from Groq')
  return { text, truncated: choice.finish_reason === 'length', provider: 'groq', model }
}

async function callOpenAIAPI(prompt: string, model: string, opts: AICompletionOptions): Promise<AICompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('NO_KEY:OpenAI API key not configured. Add OPENAI_API_KEY in Setup.')

  const messages: Array<{ role: string; content: string }> = []
  if (opts.system) messages.push({ role: 'system', content: opts.system })
  messages.push({ role: 'user', content: prompt })

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.85,
    max_tokens: opts.maxTokens ?? (opts.isBatch ? 8192 : 2048),
    ...(opts.schema ? { response_format: { type: 'json_object' } } : {}),
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } }
    const msg = err?.error?.message || `HTTP ${resp.status}`
    if (resp.status === 429) throw new Error(`RATE_LIMIT:${msg}`)
    if (resp.status === 400) throw new Error(`BAD_REQUEST:${msg}`)
    if (resp.status === 401 || resp.status === 403) throw new Error(`AUTH_ERROR:${msg}`)
    throw new Error(msg)
  }
  const data = await resp.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> }
  const choice = data.choices?.[0]
  if (!choice) throw new Error('No response from OpenAI')
  const text = choice.message?.content || ''
  if (!text) throw new Error('Empty response from OpenAI')
  return { text, truncated: choice.finish_reason === 'length', provider: 'openai', model }
}

// ════════════════════════════════════════════════════════════════════════
// Unified entry point
// ════════════════════════════════════════════════════════════════════════

export async function callAI(prompt: string, provider: AIProvider, model: string, opts: AICompletionOptions = {}): Promise<AICompletionResult> {
  switch (provider) {
    case 'gemini': return callGeminiAPI(prompt, model, opts)
    case 'groq': return callGroqAPI(prompt, model, opts)
    case 'openai': return callOpenAIAPI(prompt, model, opts)
    default: throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Calls the AI and parses the result as JSON, automatically repairing
 * truncated/malformed output. If parsing still fails, retries ONCE with
 * a smaller request (fewer batch items, more token headroom, lower
 * temperature) before giving up with a clear, diagnosable error.
 */
export async function callAIJSON<T>(prompt: string, provider: AIProvider, model: string, opts: AICompletionOptions = {}): Promise<T> {
  const result = await callAI(prompt, provider, model, opts)
  try {
    return safeParseJSON<T>(result.text)
  } catch (parseErr) {
    console.warn(`[AI:${provider}] JSON parse failed (truncated=${result.truncated}), retrying with reduced scope:`, parseErr instanceof Error ? parseErr.message : parseErr)
    const retryPrompt = opts.isBatch
      ? prompt.replace(/\b(\d+)\b/, (m) => String(Math.max(1, Math.floor(Number(m) / 2))))
      : prompt
    const retryResult = await callAI(retryPrompt, provider, model, {
      ...opts,
      maxTokens: (opts.maxTokens ?? 2048) + 1024,
      temperature: Math.max(0.3, (opts.temperature ?? 0.85) - 0.2),
    })
    return safeParseJSON<T>(retryResult.text)
  }
}
