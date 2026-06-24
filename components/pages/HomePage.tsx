'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuizStore } from '@/store/quizStore'
import { UPCAT_TOPICS, SUBJECT_LIST } from '@/data/topics'
import type { Subject, Difficulty, GradingMode } from '@/types'
import Header from '@/components/layout/Header'
import clsx from 'clsx'

type Mode = 'practice' | 'mock' | 'spaced' | 'custom'

const MODES = [
  { id: 'practice' as Mode, icon: '✏️', name: 'Practice', desc: 'Custom subjects, difficulty & timer', color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'mock' as Mode, icon: '🎯', name: 'Mock UPCAT', desc: '180 questions · 3-hour timer', color: '#DC2626', bg: '#FEF2F2' },
  { id: 'spaced' as Mode, icon: '🔁', name: 'Spaced Review', desc: 'AI-surfaced weak topics', color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'custom' as Mode, icon: '📁', name: 'My Questions', desc: 'From your uploaded content', color: '#D97706', bg: '#FFFBEB' },
]

export default function HomePage() {
  const router = useRouter()
  const { setConfig } = useQuizStore()

  const [mode, setMode] = useState<Mode>('practice')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedTopics, setSelectedTopics] = useState<Partial<Record<Subject, string[]>>>({})
  const [qCount, setQCount] = useState(10)
  const [difficulty, setDifficulty] = useState<Difficulty>('Mixed')
  const [timerSecs, setTimerSecs] = useState(0)
  const [grading, setGrading] = useState<GradingMode>('Both')
  const [audioMode, setAudioMode] = useState(false)
  const [includeCustom, setIncludeCustom] = useState(false)
  const [err, setErr] = useState('')

  const toggleSubject = (s: Subject) => {
    setSubjects(prev => {
      if (prev.includes(s)) {
        const next = prev.filter(x => x !== s)
        setSelectedTopics(t => { const n = { ...t }; delete n[s]; return n })
        return next
      }
      if (prev.length >= 4) return prev
      return [...prev, s]
    })
    setErr('')
  }

  const toggleSubtopic = (sub: Subject, st: string) => {
    setSelectedTopics(prev => {
      const cur = prev[sub] || []
      const next = cur.includes(st) ? cur.filter(x => x !== st) : [...cur, st]
      return { ...prev, [sub]: next }
    })
  }

  const handleStart = () => {
    if (mode === 'mock') {
      setConfig({ mode: 'mock', subjects: SUBJECT_LIST, qCount: 180, difficulty: 'Mixed', timerSecs: 0, grading, audioMode, includeCustom: false, selectedTopics: {} })
      router.push('/mock'); return
    }
    if (mode === 'spaced') {
      setConfig({ mode: 'spaced', subjects, selectedTopics, qCount: 20, difficulty: 'Mixed', timerSecs, grading, audioMode, includeCustom: false })
      router.push('/practice'); return
    }
    if (mode === 'custom') {
      setConfig({ mode: 'custom', subjects: SUBJECT_LIST, selectedTopics: {}, qCount, difficulty, timerSecs, grading, audioMode, includeCustom: true })
      router.push('/practice'); return
    }
    if (!subjects.length) { setErr('Please select at least one subject.'); return }
    setConfig({ mode: 'practice', subjects, selectedTopics, qCount, difficulty, timerSecs, grading, audioMode, includeCustom })
    router.push('/practice')
  }

  return (
    <>
      <Header/>
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl p-8 mb-6 text-center border" style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, var(--bg) 60%)', borderColor: 'var(--border)' }}>
          <h1 className="font-serif text-4xl mb-2" style={{ color: 'var(--text)' }}>UPCAT PREP</h1>
          <p style={{ color: 'var(--text)' }}>AI-powered questions, real UPG scoring, bilingual support. Built for UP admission.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {SUBJECT_LIST.map(s => { const d = UPCAT_TOPICS[s]; return <span key={s} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: d.bg, color: d.color }}>{d.icon} {d.label}</span> })}
          </div>
          <Link href="/about" className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 px-1">
            ℹ️ New here? See how it works →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} className={clsx('rounded-xl border-2 p-4 text-left transition-all relative overflow-hidden', mode === m.id ? 'shadow-md' : 'hover:shadow-sm')}
              style={{ borderColor: mode === m.id ? m.color : 'var(--border)', background: mode === m.id ? m.bg : 'var(--card)' }}>
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{m.name}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{m.desc}</div>
              {mode === m.id && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: m.color }}/>}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {(mode === 'practice' || mode === 'spaced') && (
            <>
              <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>1. Choose Subjects (1–4)</div>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {SUBJECT_LIST.map(s => {
                  const d = UPCAT_TOPICS[s]; const sel = subjects.includes(s)
                  return (
                    <button key={s} onClick={() => toggleSubject(s)} className={clsx('rounded-xl border-2 p-3.5 text-left transition-all relative', sel && 'shadow-sm')}
                      style={{ borderColor: sel ? d.color : 'var(--border)', background: sel ? d.bg : 'var(--card)' }}>
                      {sel && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: d.color }}>✓</div>}
                      <div className="text-xl mb-1.5">{d.icon}</div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{d.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{d.subtopics.length} subtopics</div>
                    </button>
                  )
                })}
              </div>
              {err && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{err}</p>}
              {subjects.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs font-semibold mb-2.5 uppercase tracking-wide" style={{ color: 'var(--text3)' }}>Topic Filter (optional)</div>
                  {subjects.map(sub => {
                    const d = UPCAT_TOPICS[sub]; const sel = selectedTopics[sub] || []
                    return (
                      <div key={sub} className="mb-3">
                        <div className="text-xs font-semibold mb-1.5" style={{ color: d.color }}>{sub}</div>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => setSelectedTopics(t => { const n = { ...t }; delete n[sub]; return n })}
                            className={clsx('text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors', !sel.length ? 'text-white border-blue-600' : 'hover:border-blue-400')}
                            style={{ background: !sel.length ? '#1D4ED8' : 'var(--card)', borderColor: !sel.length ? '#1D4ED8' : 'var(--border)' }}>All Topics</button>
                          {d.subtopics.map(st => (
                            <button key={st.subtopic} onClick={() => toggleSubtopic(sub, st.subtopic)}
                              className={clsx('text-xs px-2.5 py-1 rounded-full border transition-colors', sel.includes(st.subtopic) ? 'font-semibold' : 'hover:border-blue-400')}
                              style={{ background: sel.includes(st.subtopic) ? d.bg : 'var(--card)', borderColor: sel.includes(st.subtopic) ? d.color : 'var(--border)', color: sel.includes(st.subtopic) ? d.color : 'var(--text2)' }}>
                              {st.subtopic}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <hr style={{ borderColor: 'var(--border)' }} className="mb-5"/>
              <div className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>2. Session Settings</div>
            </>
          )}

          {mode === 'mock' && (
            <div className="rounded-xl border-l-4 border-red-500 p-4 mb-5 text-sm" style={{ background: '#FEF2F2' }}>
              <strong className="text-red-700 dark:text-red-400">⚠️ Mock Exam Rules:</strong>
              <ul className="mt-2 space-y-1 text-red-700 dark:text-red-400 text-xs list-disc list-inside">
                <li>180 questions across all 4 subjects (45 each)</li>
                <li>Strict 3-hour countdown — pause available for emergencies only</li>
                <li>Simulates real UPCAT conditions</li>
                <li>Full UPG calculated at the end</li>
              </ul>
            </div>
          )}

          {mode !== 'spaced' && (
            <div className="space-y-4">
              {mode !== 'mock' && (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div><div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Questions</div><div className="text-xs" style={{ color: 'var(--text3)' }}>Per session</div></div>
                  <div className="flex gap-2 flex-wrap">
                    {[10, 20, 30, 50].map(n => (
                      <button key={n} onClick={() => setQCount(n)} className={clsx('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors', qCount === n ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-400')} style={qCount !== n ? { borderColor: 'var(--border)', color: 'var(--text2)' } : {}}>{n}</button>
                    ))}
                  </div>
                </div>
              )}
              {mode !== 'mock' && (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Difficulty</div>
                  <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    {(['Mixed', 'Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                      <button key={d} onClick={() => setDifficulty(d)} className={clsx('px-3 py-1.5 text-sm font-medium transition-colors', difficulty === d ? 'bg-blue-600 text-white' : '')} style={difficulty !== d ? { color: 'var(--text2)', background: 'var(--card)' } : {}}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {mode !== 'mock' && (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div><div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Timer per Question</div><div className="text-xs" style={{ color: 'var(--text3)' }}>0 = no timer</div></div>
                  <div className="flex gap-2 flex-wrap">
                    {[{ v: 0, l: 'None' }, { v: 30, l: '30s' }, { v: 60, l: '60s' }, { v: 90, l: '90s' }, { v: 120, l: '2m' }].map(({ v, l }) => (
                      <button key={v} onClick={() => setTimerSecs(v)} className={clsx('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors', timerSecs === v ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-400')} style={timerSecs !== v ? { borderColor: 'var(--border)', color: 'var(--text2)' } : {}}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Grading Display</div>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  {(['Both', 'UPG', 'Percent'] as GradingMode[]).map(g => (
                    <button key={g} onClick={() => setGrading(g)} className={clsx('px-3 py-1.5 text-sm font-medium transition-colors', grading === g ? 'bg-blue-600 text-white' : '')} style={grading !== g ? { color: 'var(--text2)', background: 'var(--card)' } : {}}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div><div className="text-sm font-medium" style={{ color: 'var(--text)' }}>🔊 Audio Mode</div><div className="text-xs" style={{ color: 'var(--text3)' }}>TTS reads questions (English + Filipino)</div></div>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  {[{ v: false, l: 'Off' }, { v: true, l: 'On' }].map(({ v, l }) => (
                    <button key={l} onClick={() => setAudioMode(v)} className={clsx('px-4 py-1.5 text-sm font-medium transition-colors', audioMode === v ? 'bg-blue-600 text-white' : '')} style={audioMode !== v ? { color: 'var(--text2)', background: 'var(--card)' } : {}}>{l}</button>
                  ))}
                </div>
              </div>
              {mode === 'practice' && (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div><div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Include My Questions</div><div className="text-xs" style={{ color: 'var(--text3)' }}>Mix in uploaded custom questions</div></div>
                  <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    {[{ v: false, l: 'No' }, { v: true, l: 'Yes' }].map(({ v, l }) => (
                      <button key={l} onClick={() => setIncludeCustom(v)} className={clsx('px-4 py-1.5 text-sm font-medium transition-colors', includeCustom === v ? 'bg-blue-600 text-white' : '')} style={includeCustom !== v ? { color: 'var(--text2)', background: 'var(--card)' } : {}}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 rounded-xl p-3.5 text-xs leading-relaxed" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            <strong>UPG Formula:</strong> Math 20% + Science 20% + Reading 30% + Language 30%. Each subject is transmuted to a 1.0–5.0 scale. Lower UPG = better. 1.0 is perfect.
          </div>

          <button onClick={handleStart} className="mt-5 w-full py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-base transition-colors flex items-center justify-center gap-2">
            {mode === 'mock' ? '🎯 Start Mock Exam (180Q / 3h)' : mode === 'spaced' ? '🔁 Start Spaced Review' : mode === 'custom' ? '📁 Start Custom Quiz' : 'Start Practice Session →'}
          </button>
        </div>
      </main>
    </>
  )
}
