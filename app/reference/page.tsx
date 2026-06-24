'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import MathRenderer from '@/components/ui/MathRenderer'
import { UPCAT_TOPICS, SUBJECT_LIST } from '@/data/topics'
import type { Subject } from '@/types'

interface Guide { title: string; sections: Array<{ heading: string; content: string }> }

export default function ReferencePage() {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null)

  const load = async (subject: Subject) => {
    setLoading(true); setError(''); setGuide(null); setActiveSubject(subject)
    try {
      const res = await fetch('/api/reference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject }) })
      if (!res.ok) throw new Error('Failed to generate guide')
      const data = await res.json() as { guide: Guide }
      setGuide(data.guide)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header/>
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>📚 Quick Reference</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>AI-generated study summaries for each UPCAT subject.</p>
        <div className="flex gap-2 flex-wrap mb-6">
          {SUBJECT_LIST.map(s => {
            const d = UPCAT_TOPICS[s]
            return (
              <button key={s} onClick={() => load(s)} className="px-4 py-2 rounded-xl border-2 text-sm font-medium transition-colors hover:shadow-sm"
                style={{ borderColor: activeSubject === s ? d.color : 'var(--border)', background: activeSubject === s ? d.bg : 'var(--card)', color: activeSubject === s ? d.color : 'var(--text)' }}>
                {d.icon} {s}
              </button>
            )
          })}
        </div>

        {!guide && !loading && !error && <div className="text-center py-16" style={{ color: 'var(--text3)' }}><div className="text-4xl mb-3">📚</div><p className="text-sm">Select a subject above to generate a reference guide.</p></div>}
        {loading && <div className="flex flex-col items-center py-16 gap-3"><div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/><p className="text-sm" style={{ color: 'var(--text2)' }}>Generating {activeSubject} reference guide...</p></div>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center py-8">⚠️ {error}</p>}

        {guide && !loading && (
          <div>
            <div className="mb-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-serif text-2xl" style={{ color: 'var(--text)' }}>{activeSubject && UPCAT_TOPICS[activeSubject].icon} {guide.title}</h2>
            </div>
            <div className="space-y-3">
              {guide.sections.map((s, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `4px solid ${activeSubject ? UPCAT_TOPICS[activeSubject].color : '#1D4ED8'}` }}>
                  <div className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text)' }}>{s.heading}</div>
                  <div className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}><MathRenderer>{s.content}</MathRenderer></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
