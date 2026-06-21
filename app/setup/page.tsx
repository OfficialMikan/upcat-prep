'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'

export default function SetupPage() {
  const [keyStatus, setKeyStatus] = useState<'checking' | 'configured' | 'missing'>('checking')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    const configured = localStorage.getItem('upcat_api_configured') === 'true'
    setKeyStatus(configured ? 'configured' : 'missing')
  }, [])

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/generate-question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Math', subtopic: 'Algebra', topic: 'Linear Equations', difficulty: 'Easy', skipCache: true, useLite: true }),
      })
      if (res.ok) {
        setTestResult({ ok: true, message: '✅ Connection successful! Gemini API is configured correctly on the server.' })
        localStorage.setItem('upcat_api_configured', 'true'); setKeyStatus('configured')
      } else {
        const data = await res.json() as { message?: string; error?: string }
        if (data.error === 'auth') {
          setTestResult({ ok: false, message: '❌ Invalid API key. Check your GEMINI_API_KEY environment variable.' })
          localStorage.setItem('upcat_api_configured', 'false'); setKeyStatus('missing')
        } else if (data.error === 'rate_limit') {
          setTestResult({ ok: true, message: '⚡ API key works, but rate limit is active. Wait a moment and try a question.' })
          localStorage.setItem('upcat_api_configured', 'true'); setKeyStatus('configured')
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

  return (
    <>
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>⚙️ Setup Guide</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>Configure your Gemini API key and Supabase database.</p>

        <div className={`rounded-xl p-4 mb-6 text-sm ${keyStatus === 'configured' ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
          {keyStatus === 'configured' ? <strong>✅ API Connection Verified.</strong> : <strong>⚠️ API Not Yet Verified.</strong>} {keyStatus === 'configured' ? 'Server-side Gemini API is working correctly.' : 'Click "Test Connection" below after setting environment variables.'}
        </div>

        <div className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">1</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Get a Free Gemini API Key</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
                Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 font-medium underline">aistudio.google.com/app/apikey</a><br/><br/>
                Sign in with Google → click <strong>&quot;Create API Key&quot;</strong> → copy the full key (starts with <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">AIzaSy...</code>)
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">2</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Add Environment Variables</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text2)' }}>
                Your API key is now stored <strong>server-side only</strong> — never exposed to the browser. Create a <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">.env.local</code> file in your project root:
              </p>
              <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">{`GEMINI_API_KEY=AIzaSyYOUR_KEY_HERE

NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here`}</pre>
              <p className="text-xs mt-2" style={{ color: 'var(--text3)' }}>On Vercel/Netlify: add these in your project&apos;s Environment Variables settings instead.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">3</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Set Up Supabase (Database)</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
                1. Create a free project at <a href="https://supabase.com" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 underline">supabase.com</a><br/>
                2. Go to <strong>SQL Editor</strong> and run the schema from <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">supabase/schema.sql</code><br/>
                3. Go to <strong>Project Settings → API</strong> → copy the <strong>Project URL</strong> and <strong>anon/public key</strong> into <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">.env.local</code>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">4</div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Test Your Connection</h3>
              <button onClick={handleTest} disabled={testing} className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">{testing ? 'Testing...' : '🧪 Test Connection'}</button>
              {testResult && <p className={`text-sm mt-3 ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{testResult.message}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-green-300 dark:border-green-800 p-6" style={{ background: '#F0FDF4' }}>
          <h3 className="font-semibold mb-2 text-green-800 dark:text-green-300">Rate Limits &amp; Auto-Optimization</h3>
          <div className="text-sm leading-relaxed text-green-800 dark:text-green-300 space-y-1">
            <p><strong>Gemini 2.5 Flash:</strong> 10 req/min, 250K tokens/day</p>
            <p><strong>Gemini 2.5 Flash-Lite:</strong> 15 req/min, 1M tokens/day (used for chat &amp; flashcards)</p>
            <p className="mt-2">✓ Pre-fetches questions in the background<br/>✓ Questions cached in Supabase — repeated topics load instantly<br/>✓ On rate limit (429), auto-retries with backoff<br/>✓ Safety-blocked prompts automatically skip to a different topic</p>
          </div>
        </div>
      </div>
    </>
  )
}
