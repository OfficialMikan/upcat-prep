'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { useAISettingsStore } from '@/store/aiSettingsStore'
import { MODEL_CATALOGUE, PROVIDER_LABELS, PROVIDER_KEY_HELP } from '@/types/providers'
import type { AIProvider } from '@/types/providers'
import clsx from 'clsx'

interface KeyStatus { gemini: boolean; groq: boolean; openai: boolean }

export default function SetupPage() {
  const { provider, model, setProviderModel } = useAISettingsStore()
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(provider)

  useEffect(() => {
    fetch('/api/ai-status')
      .then(r => r.json())
      .then((data: { keyStatus: KeyStatus }) => setKeyStatus(data.keyStatus))
      .catch(() => setKeyStatus({ gemini: false, groq: false, openai: false }))
      .finally(() => setLoadingStatus(false))
  }, [])

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/generate-question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Math', subtopic: 'Algebra', topic: 'Linear Equations', difficulty: 'Easy', skipCache: true, provider, model }),
      })
      if (res.ok) {
        const data = await res.json() as { _meta?: { provider: string; model: string } }
        setTestResult({ ok: true, message: `✅ Connection successful! Generated a test question using ${data._meta?.provider || provider} (${data._meta?.model || model}).` })
        localStorage.setItem('upcat_api_configured', 'true')
      } else {
        const data = await res.json() as { message?: string; error?: string }
        if (data.error === 'auth' || data.error === 'no_key') {
          setTestResult({ ok: false, message: `❌ ${data.message || 'Invalid or missing API key for the selected provider.'}` })
          localStorage.setItem('upcat_api_configured', 'false')
        } else if (data.error === 'rate_limit') {
          setTestResult({ ok: true, message: '⚡ API key works, but rate limit is active right now. Wait a moment and try again.' })
          localStorage.setItem('upcat_api_configured', 'true')
        } else {
          setTestResult({ ok: false, message: `❌ ${data.message || 'Connection failed'}` })
        }
      }
    } catch {
      setTestResult({ ok: false, message: '❌ Network error. Check your deployment configuration.' })
    } finally {
      setTesting(false)
    }
  }

  const providersList: AIProvider[] = ['gemini', 'groq', 'openai']
  const modelsForProvider = (p: AIProvider) => MODEL_CATALOGUE.filter(m => m.provider === p)

  return (
    <>
      <Header/>
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>⚙️ Setup Guide</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>Configure your AI provider and Supabase database.</p>

        {/* ── Provider & Model Picker ─────────────────────────────────── */}
        <section aria-labelledby="provider-heading" className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 id="provider-heading" className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Choose Your AI Provider</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>Pick whichever provider you have an API key for. You can switch anytime — this is saved in your browser.</p>

          <div role="radiogroup" aria-label="AI Provider" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
            {providersList.map(p => {
              const hasKey = keyStatus?.[p]
              const isSelected = selectedProvider === p
              return (
                <button
                  key={p}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${PROVIDER_LABELS[p]}${hasKey ? ', key configured' : ', no key configured'}`}
                  onClick={() => { setSelectedProvider(p); const firstModel = modelsForProvider(p)[0]; if (firstModel) setProviderModel(p, firstModel.id) }}
                  className={clsx(
                    'rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                    isSelected ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'hover:border-blue-300 bg-[var(--card)]'
                  )}
                  style={!isSelected ? { borderColor: 'var(--border)' } : undefined}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{PROVIDER_LABELS[p]}</span>
                    {!loadingStatus && (
                      <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded-full', hasKey ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400')}>
                        {hasKey ? '✓ Key set' : 'No key'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text2)' }}>{modelsForProvider(p).length} models available</div>
                </button>
              )
            })}
          </div>

          <fieldset>
            <legend className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Model for {PROVIDER_LABELS[selectedProvider]}</legend>
            <div className="space-y-2">
              {modelsForProvider(selectedProvider).map(m => (
                <label key={m.id} className={clsx(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                  model === m.id && selectedProvider === provider ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'hover:border-blue-300 bg-[var(--card2)]'
                )} style={model === m.id && selectedProvider === provider ? undefined : { borderColor: 'var(--border)' }}>
                  <input
                    type="radio"
                    name="model"
                    value={m.id}
                    checked={model === m.id && selectedProvider === provider}
                    onChange={() => setProviderModel(selectedProvider, m.id)}
                    className="mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {m.label}
                      <span className={clsx('ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full',
                        m.speedTier === 'fast' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : m.speedTier === 'quality' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300')}>
                        {m.speedTier}
                      </span>
                    </div>
                    {m.contextNote && <div className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{m.contextNote}</div>}
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 text-sm" style={{ color: 'var(--text2)' }}>
            Don&apos;t have a key for {PROVIDER_LABELS[selectedProvider]} yet? Get one free at{' '}
            <a href={PROVIDER_KEY_HELP[selectedProvider].url} target="_blank" rel="noopener" className="text-blue-700 dark:text-blue-400 font-medium underline">
              {PROVIDER_KEY_HELP[selectedProvider].label}
            </a>.
          </div>
        </section>

        {/* ── Test connection ─────────────────────────────────────────── */}
        <section aria-labelledby="test-heading" className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 id="test-heading" className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Test Your Connection</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--text2)' }}>Generates one real test question using your selected provider and model.</p>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {testing ? 'Testing…' : '🧪 Test Connection'}
          </button>
          {testResult && (
            <p role="status" className={clsx('text-sm mt-3', testResult.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
              {testResult.message}
            </p>
          )}
        </section>

        {/* ── Env var instructions ────────────────────────────────────── */}
        <section aria-labelledby="env-heading" className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 id="env-heading" className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Add Environment Variables</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text2)' }}>
            All API keys are stored <strong>server-side only</strong> — never exposed to the browser. Create a <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">.env.local</code> file in your project root (you only need the provider(s) you plan to use):
          </p>
          <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">{`GEMINI_API_KEY=AIzaSyYOUR_KEY_HERE
GROQ_API_KEY=gsk_YOUR_KEY_HERE
OPENAI_API_KEY=sk-YOUR_KEY_HERE

NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here`}</pre>
          <p className="text-xs mt-2" style={{ color: 'var(--text2)' }}>On Vercel/Netlify: add these in your project&apos;s Environment Variables settings instead, then redeploy.</p>
        </section>

        {/* ── Supabase ─────────────────────────────────────────────────── */}
        <section aria-labelledby="db-heading" className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 id="db-heading" className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Set Up Supabase (Database)</h2>
          <ol className="text-sm leading-relaxed list-decimal list-inside space-y-1" style={{ color: 'var(--text2)' }}>
            <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noopener" className="text-blue-700 dark:text-blue-400 underline">supabase.com</a></li>
            <li>Go to <strong>SQL Editor</strong> and run the schema from <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">supabase/schema.sql</code></li>
            <li>Go to <strong>Project Settings → API</strong> → copy the <strong>Project URL</strong> and <strong>anon/public key</strong> into <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">.env.local</code></li>
          </ol>
        </section>

        {/* ── Rate limits info ─────────────────────────────────────────── */}
        <section aria-labelledby="limits-heading" className="rounded-2xl border-2 p-6 bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800">
          <h2 id="limits-heading" className="font-semibold mb-2 text-green-900 dark:text-green-300">Rate Limits &amp; Auto-Optimization</h2>
          <div className="text-sm leading-relaxed text-green-900 dark:text-green-300 space-y-1">
            <p><strong>Gemini:</strong> Flash — 10 req/min · Flash-Lite — 15 req/min, 1M tokens/day</p>
            <p><strong>Groq:</strong> Very generous free tier, extremely fast inference (LPU hardware)</p>
            <p><strong>OpenAI:</strong> Pay-as-you-go; GPT-4o mini is the most economical choice here</p>
            <p className="mt-2">✓ Pre-fetches questions in the background<br/>✓ Questions cached in Supabase — repeated topics load instantly<br/>✓ On rate limit (429), auto-retries with backoff<br/>✓ Truncated/malformed AI responses are automatically repaired or retried<br/>✓ Safety-blocked prompts automatically skip to a different topic</p>
          </div>
        </section>
      </main>
    </>
  )
}
