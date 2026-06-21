'use client'
import { useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import MathRenderer, { mathToSpeech } from '@/components/ui/MathRenderer'
import { UPCAT_TOPICS, SUBJECT_LIST } from '@/data/topics'
import type { Subject, Flashcard } from '@/types'
import { upsertSRItem, getTopicStatsFromDB } from '@/lib/supabase'
import clsx from 'clsx'

type Rating = 'easy' | 'medium' | 'hard'

export default function FlashcardsPage() {
  const [active, setActive] = useState(false)
  const [subject, setSubject] = useState<Subject>('Math')
  const [count, setCount] = useState(10)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({ easy: 0, medium: 0, hard: 0 })
  const [done, setDone] = useState(false)

  const current = cards[idx]

  const findWeakSubject = async (): Promise<Subject> => {
    const stats = await getTopicStatsFromDB()
    const subScores: Record<string, { c: number; t: number }> = {}
    stats.forEach((s: { subject: string; correct: number; total: number }) => {
      if (!subScores[s.subject]) subScores[s.subject] = { c: 0, t: 0 }
      subScores[s.subject].c += s.correct
      subScores[s.subject].t += s.total
    })
    const sorted = Object.entries(subScores).sort((a, b) => {
      const pa = a[1].t > 0 ? a[1].c / a[1].t : 1
      const pb = b[1].t > 0 ? b[1].c / b[1].t : 1
      return pa - pb
    })
    return (sorted[0]?.[0] as Subject) || 'Math'
  }

  const start = useCallback(async (sub: Subject | 'Weak') => {
    setError(''); setLoading(true); setActive(true); setDone(false); setIdx(0); setFlipped(false)
    setCounts({ easy: 0, medium: 0, hard: 0 }); setCards([])

    const actualSub = sub === 'Weak' ? await findWeakSubject() : sub
    setSubject(actualSub)
    const subData = UPCAT_TOPICS[actualSub]
    const all = subData.subtopics.flatMap(st => st.topics.map(t => ({ subtopic: st.subtopic, topic: t })))
    const pick = all[Math.floor(Math.random() * all.length)]

    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: actualSub, subtopic: pick.subtopic, topic: pick.topic, count, useLite: true }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || 'Failed to generate flashcards')
      }
      const data = await res.json() as { cards: Array<{ front: string; back: string; language: string }> }
      const mapped: Flashcard[] = data.cards.map(c => ({ subject: actualSub, subtopic: pick.subtopic, topic: pick.topic, front: c.front, back: c.back, language: c.language as 'en' | 'fil' }))
      setCards(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load flashcards')
    } finally {
      setLoading(false)
    }
  }, [count])

  const handleFlip = () => {
    setFlipped(f => !f)
    if (!flipped && current && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(mathToSpeech(current.back))
      utt.lang = current.language === 'fil' ? 'fil-PH' : 'en-US'
      utt.rate = 0.9
      window.speechSynthesis.speak(utt)
    }
  }

  const handleRate = async (rating: Rating) => {
    if (current) {
      const isGood = rating === 'easy' || rating === 'medium'
      await upsertSRItem(current.subject, current.topic, current.subtopic, isGood).catch(() => {})
    }
    setCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }))
    if (idx + 1 >= cards.length) setDone(true)
    else { setIdx(i => i + 1); setFlipped(false) }
  }

  const remaining = cards.length - (counts.easy + counts.medium + counts.hard)
  const progress = cards.length > 0 ? ((counts.easy + counts.medium + counts.hard) / cards.length) * 100 : 0
  const exitSession = () => { setActive(false); setCards([]); setDone(false) }

  return (
    <>
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>🃏 Flashcard Mode</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>Quick drills. Tap the card to flip. Rate your confidence to schedule spaced review.</p>

        {!active && (
          <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Choose subject:</div>
            <div className="flex gap-2 flex-wrap mb-5">
              {SUBJECT_LIST.map(s => {
                const d = UPCAT_TOPICS[s]
                return <button key={s} onClick={() => start(s)} className="px-4 py-2 rounded-xl border-2 text-sm font-medium transition-colors hover:shadow-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>{d.icon} {s}</button>
              })}
              <button onClick={() => start('Weak')} className="px-4 py-2 rounded-xl border-2 text-sm font-medium transition-colors hover:shadow-sm border-red-400 text-red-600 dark:text-red-400">🔁 My Weak Areas</button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Cards per session</div>
              <div className="flex gap-2">
                {[10, 20, 30].map(n => (
                  <button key={n} onClick={() => setCount(n)} className={clsx('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors', count === n ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-400')} style={count !== n ? { borderColor: 'var(--border)', color: 'var(--text2)' } : {}}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {active && (
          <div>
            <button onClick={exitSession} className="text-sm mb-4 hover:text-blue-600 transition-colors" style={{ color: 'var(--text2)' }}>← Back to setup</button>
            <div className="flex justify-center gap-6 mb-4">
              {[{ label: 'Easy', val: counts.easy, color: '#22C55E' }, { label: 'Medium', val: counts.medium, color: '#F59E0B' }, { label: 'Hard', val: counts.hard, color: '#EF4444' }, { label: 'Left', val: remaining, color: 'var(--text)' }].map(({ label, val, color }) => (
                <div key={label} className="text-center"><div className="font-serif text-2xl" style={{ color }}>{val}</div><div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text3)' }}>{label}</div></div>
              ))}
            </div>
            <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--border)' }}><div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }}/></div>

            {loading && <div className="flex flex-col items-center py-16 gap-3"><div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/><p className="text-sm" style={{ color: 'var(--text2)' }}>Generating {count} flashcards...</p></div>}

            {error && !loading && (
              <div className="text-center py-10">
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">⚠️ {error}</p>
                <button onClick={() => start(subject)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Retry</button>
              </div>
            )}

            {done && !loading && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="font-serif text-2xl mb-2" style={{ color: 'var(--text)' }}>Session Complete!</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>Easy: {counts.easy} · Medium: {counts.medium} · Hard: {counts.hard}</p>
                <button onClick={exitSession} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">Back to Setup</button>
              </div>
            )}

            {current && !loading && !done && (
              <div>
                <div className="max-w-lg mx-auto" style={{ perspective: '1000px' }}>
                  <div onClick={handleFlip} className="relative w-full min-h-[220px] cursor-pointer preserve-3d transition-transform duration-500" style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}>
                    <div className="absolute inset-0 backface-hidden rounded-2xl border-2 p-7 flex flex-col items-center justify-center text-center shadow-md" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--text3)' }}>{subject.toUpperCase()} — {current.subtopic.toUpperCase()}</div>
                      <div className="font-serif text-xl leading-snug" style={{ color: 'var(--text)' }}><MathRenderer>{current.front}</MathRenderer></div>
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 p-7 flex flex-col items-center justify-center text-center shadow-md text-white" style={{ background: 'linear-gradient(135deg, #0F3460, #1755A8)', borderColor: '#1755A8' }}>
                      <div className="text-xs font-bold tracking-widest uppercase mb-3 opacity-60">ANSWER</div>
                      <div className="text-base leading-relaxed"><MathRenderer>{current.back}</MathRenderer></div>
                    </div>
                  </div>
                </div>
                {!flipped && <p className="text-center text-sm mt-3" style={{ color: 'var(--text3)' }}>👆 Tap card to reveal answer</p>}
                {flipped && (
                  <div className="flex justify-center gap-3 mt-5 flex-wrap">
                    <button onClick={() => handleRate('hard')} className="px-6 py-2.5 rounded-xl font-medium text-sm bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 transition-colors">😰 Hard</button>
                    <button onClick={() => handleRate('medium')} className="px-6 py-2.5 rounded-xl font-medium text-sm bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 transition-colors">🤔 Medium</button>
                    <button onClick={() => handleRate('easy')} className="px-6 py-2.5 rounded-xl font-medium text-sm bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 transition-colors">😊 Easy</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
