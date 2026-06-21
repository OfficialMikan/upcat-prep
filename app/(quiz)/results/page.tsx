'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import clsx from 'clsx'
import MathRenderer from '@/components/ui/MathRenderer'
import type { Question } from '@/types'
import { upgDescription, transmutePct } from '@/data/topics'
import { saveSessionToDB } from '@/lib/supabase'
import Header from '@/components/layout/Header'

interface SessionResult {
  mode: string; subjects: string[]; difficulty: string
  correct: number; total: number; pct: number; avgTime: number; totalTimeSec: number; upg: number | null
  subStats: Record<string, { correct: number; total: number }>
  answers: Array<{ questionIndex: number; chosen: number; correct: number; subject: string; topic: string; subtopic: string; timeSpent: number; timedOut: boolean }>
  questions: Question[]
}

const SUB_COLORS: Record<string, string> = { Math: '#1D4ED8', Science: '#15803D', Reading: '#7C3AED', Language: '#0F766E' }

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<SessionResult | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('upcat_last_result')
    if (!stored) { router.replace('/'); return }
    const r = JSON.parse(stored) as SessionResult
    setResult(r)
    saveSessionToDB({ mode: r.mode, subjects: r.subjects, difficulty: r.difficulty, correct: r.correct, total: r.total, pct: r.pct, avgTime: r.avgTime, totalTimeSec: r.totalTimeSec, upg: r.upg, subStats: r.subStats })
      .then(() => setSaved(true)).catch(() => {})
  }, [router])

  if (!result) return (
    <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
  )

  const fmtTime = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`
  const isGood = result.pct >= 80
  const isMid = result.pct >= 60 && result.pct < 80
  const emoji = isGood ? '🎉' : isMid ? '📚' : '💪'
  const headline = isGood ? 'Excellent Work!' : isMid ? 'Good Effort!' : 'Keep Pushing!'

  const chartData = Object.entries(result.subStats).map(([sub, st]) => ({
    name: sub, pct: st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0,
    correct: st.correct, total: st.total, upg: transmutePct(st.total > 0 ? (st.correct / st.total) * 100 : 0),
  }))

  return (
    <>
      <Header/>
      <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{emoji}</div>
          <h1 className="font-serif text-3xl mb-2" style={{ color: 'var(--text)' }}>{headline}</h1>
          <p style={{ color: 'var(--text2)' }}>You answered <strong>{result.correct}</strong> out of <strong>{result.total}</strong> questions correctly.</p>
        </div>

        <div className="rounded-2xl p-8 text-white text-center mb-6" style={{ background: 'linear-gradient(135deg, #0F3460 0%, #1755A8 100%)' }}>
          <div className="text-white/60 text-sm mb-1">{result.pct}% correct</div>
          {result.upg ? (
            <>
              <div className="font-serif text-6xl mb-2">{result.upg}</div>
              <div className="text-white/80 text-sm mb-1">Estimated UPG Score</div>
              <div className="text-white/50 text-xs">{upgDescription(result.upg)}</div>
            </>
          ) : <div className="font-serif text-6xl">{result.pct}%</div>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[{ label: 'Score', value: `${result.correct}/${result.total}` }, { label: 'Avg Time/Q', value: `${result.avgTime}s` }, { label: 'Total Time', value: fmtTime(result.totalTimeSec) }, { label: 'Accuracy', value: `${result.pct}%` }].map(({ label, value }) => (
            <div key={label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="font-serif text-2xl" style={{ color: 'var(--text)' }}>{value}</div>
              <div className="text-xs mt-1 uppercase tracking-wide" style={{ color: 'var(--text3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="rounded-2xl border p-5 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Subject Breakdown</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>Accuracy per subject</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text2)' }}/>
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text3)' }}/>
                  <Tooltip formatter={(value, _name, props) => [`${value}% (${props.payload.correct}/${props.payload.total})`, 'Accuracy']}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]}>{chartData.map(entry => <Cell key={entry.name} fill={SUB_COLORS[entry.name] || '#888'}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {chartData.map(({ name, pct, correct, total, upg }) => (
                <div key={name} className="flex items-center justify-between text-sm py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2"><span className="font-semibold" style={{ color: SUB_COLORS[name] || 'var(--text)' }}>{name}</span><span style={{ color: 'var(--text3)' }}>{correct}/{total}</span></div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 70 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444' }}/>
                    </div>
                    <span className="font-semibold w-10 text-right" style={{ color: 'var(--text)' }}>{pct}%</span>
                    <span className="text-xs w-14 text-right" style={{ color: 'var(--text3)' }}>UPG: {upg}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <button onClick={() => setShowReview(r => !r)} className="w-full flex items-center justify-between p-5 text-left">
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Question Review ({result.answers.length} questions)</span>
            <span style={{ color: 'var(--text3)' }}>{showReview ? '▲' : '▼'}</span>
          </button>
          {showReview && (
            <div className="border-t px-5 pb-5 space-y-3 max-h-[500px] overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
              {result.answers.map((ans, i) => {
                const q = result.questions[ans.questionIndex]
                if (!q) return null
                const isCorr = ans.chosen === ans.correct
                return (
                  <div key={i} className={clsx('rounded-xl border-l-4 p-4', isCorr ? 'border-green-500' : 'border-red-500')} style={{ borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>Q{i + 1} · {q.subject} · {q.topic}</span>
                      <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full shrink-0', isCorr ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300')}>
                        {isCorr ? '✓ Correct' : ans.timedOut ? '⏰ Time up' : '✗ Wrong'}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text)' }}><MathRenderer>{q.question}</MathRenderer></p>
                    {!isCorr && ans.chosen >= 0 && <p className="text-xs" style={{ color: '#EF4444' }}>Your answer: {String.fromCharCode(65 + ans.chosen)}. <MathRenderer>{q.choices[ans.chosen]}</MathRenderer></p>}
                    <p className="text-xs" style={{ color: '#22C55E' }}>Correct: {String.fromCharCode(65 + q.correct)}. <MathRenderer>{q.choices[q.correct]}</MathRenderer></p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">Practice Again</Link>
          <Link href="/dashboard" className="px-6 py-3 rounded-xl border font-semibold text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>📊 Dashboard</Link>
          <Link href="/flashcards" className="px-6 py-3 rounded-xl border font-semibold text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>🃏 Flashcards</Link>
        </div>
        {saved && <p className="text-xs mt-3" style={{ color: 'var(--text3)' }}>✓ Session saved to database</p>}
      </div>
    </>
  )
}
