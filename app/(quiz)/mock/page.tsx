'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import { useQuizStore } from '@/store/quizStore'
import QuestionCard from '@/components/quiz/QuestionCard'
import LiveScoreHUD from '@/components/quiz/LiveScoreHUD'
import ChatbotSidebar from '@/components/chat/ChatbotSidebar'
import type { Question, Subject, Answer } from '@/types'
import { UPCAT_TOPICS } from '@/data/topics'
import { upsertTopicStat, upsertSRItem } from '@/lib/supabase'

const SUBJECTS_ORDER: Subject[] = ['Math', 'Science', 'Reading', 'Language']
const Q_PER_SUBJECT = 45
const TOTAL_Q = 180
const MOCK_DURATION_MS = 3 * 60 * 60 * 1000

export default function MockExamPage() {
  const router = useRouter()
  const store = useQuizStore()
  const { config, questions, answers, currentIndex, isAnswered, startSession, pushQuestion, pushPrefetched, shiftPrefetch, recordAnswer, nextQuestion, setStatus, finishSession, status } = store

  const [chosenIndex, setChosenIndex] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('3:00:00')
  const [timerDanger, setTimerDanger] = useState(false)
  const [timerWarn, setTimerWarn] = useState(false)
  const [paused, setPaused] = useState(false)
  const mockEndTimeRef = useRef<number>(0)
  const remainingAtPauseRef = useRef<number>(MOCK_DURATION_MS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prefetchingRef = useRef(false)
  const initRef = useRef(false)
  const loadNextQuestionRef = useRef<() => Promise<void>>(async () => {})
  const handleFinishRef = useRef<() => void>(() => {})

  const currentQ: Question | undefined = questions[currentIndex]

  function getNextContext() {
    const subIdx = Math.floor(useQuizStore.getState().questions.length / Q_PER_SUBJECT)
    const sub = SUBJECTS_ORDER[Math.min(subIdx, 3)]
    const subData = UPCAT_TOPICS[sub]
    const all = subData.subtopics.flatMap(st => st.topics.map(t => ({ subtopic: st.subtopic, topic: t })))
    const pick = all[Math.floor(Math.random() * all.length)]
    return { subject: sub, subtopic: pick.subtopic, topic: pick.topic }
  }

  function startMockTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, mockEndTimeRef.current - Date.now())
      const h = Math.floor(rem / 3600000), m = Math.floor((rem % 3600000) / 60000), s = Math.floor((rem % 60000) / 1000)
      setTimeRemaining(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      setTimerWarn(rem < 30 * 60000)
      setTimerDanger(rem < 10 * 60000)
      if (rem <= 0) { clearInterval(timerRef.current!); handleFinishRef.current() }
    }, 1000)
  }

  async function prefetchMore() {
    if (prefetchingRef.current) return
    prefetchingRef.current = true
    try {
      const res = await fetch('/api/generate-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...getNextContext(), difficulty: 'Mixed', useLite: true }) })
      if (res.ok) {
        const data = await res.json() as { question: Question }
        if (data.question) pushPrefetched(data.question)
      }
    } catch { /* silent */ }
    prefetchingRef.current = false
  }

  const loadNextQuestion = useCallback(async () => {
    setStatus('loading')
    setChosenIndex(null)
    const prefetched = shiftPrefetch()
    if (prefetched) { pushQuestion(prefetched); prefetchMore(); return }
    const ctx = getNextContext()
    try {
      const res = await fetch('/api/generate-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, difficulty: 'Mixed', useLite: true }) })
      if (res.status === 429) {
        const data = await res.json() as { waitSecs?: number }
        setTimeout(() => loadNextQuestionRef.current(), (data.waitSecs || 30) * 1000)
        return
      }
      const data = await res.json() as { question: Question }
      if (data.question) { pushQuestion(data.question); prefetchMore() }
    } catch { setTimeout(() => loadNextQuestionRef.current(), 3000) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadNextQuestionRef.current = loadNextQuestion }, [loadNextQuestion])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    startSession()
    store.setConfig({ subjects: SUBJECTS_ORDER, qCount: TOTAL_Q, mode: 'mock' })
    mockEndTimeRef.current = Date.now() + MOCK_DURATION_MS
    startMockTimer()
    loadNextQuestionRef.current()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAnswer = useCallback((chosen: number) => {
    if (isAnswered || !currentQ) return
    setChosenIndex(chosen)
    const timeSpent = Math.round((Date.now() - useQuizStore.getState().questionStartTime) / 1000)
    const isCorrect = chosen === currentQ.correct
    recordAnswer({ questionIndex: currentIndex, chosen, correct: currentQ.correct, subject: currentQ.subject, topic: currentQ.topic, subtopic: currentQ.subtopic, timeSpent, timedOut: false } as Answer, isCorrect)
    upsertTopicStat(currentQ.subject, currentQ.subtopic, currentQ.topic, isCorrect).catch(() => {})
    upsertSRItem(currentQ.subject, currentQ.topic, currentQ.subtopic, isCorrect).catch(() => {})
  }, [isAnswered, currentQ, currentIndex, recordAnswer])

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const result = finishSession()
    if (result) sessionStorage.setItem('upcat_last_result', JSON.stringify(result))
    router.push('/results')
  }, [finishSession, router])

  useEffect(() => { handleFinishRef.current = handleFinish }, [handleFinish])

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= TOTAL_Q) { handleFinish(); return }
    nextQuestion()
    loadNextQuestion()
  }, [currentIndex, nextQuestion, loadNextQuestion, handleFinish])

  const handlePause = () => {
    remainingAtPauseRef.current = Math.max(0, mockEndTimeRef.current - Date.now())
    setPaused(true)
    if (timerRef.current) clearInterval(timerRef.current)
  }
  const handleResume = () => {
    mockEndTimeRef.current = Date.now() + remainingAtPauseRef.current
    setPaused(false)
    startMockTimer()
  }

  const confirmSubmit = () => { if (confirm(`Submit exam? You've answered ${answers.length}/${TOTAL_Q} questions.`)) handleFinish() }

  const subjectLabel = (idx: number) => SUBJECTS_ORDER[Math.min(Math.floor(idx / Q_PER_SUBJECT), 3)]
  const subjectColor = (sub: Subject) => UPCAT_TOPICS[sub]?.color || '#888'

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 text-white px-4 py-3" style={{ background: '#1A1816' }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-wider opacity-60 mb-0.5">MOCK UPCAT EXAM</div>
              <div className="text-sm opacity-80">{subjectLabel(currentIndex)} Section · Q{currentIndex + 1}/{TOTAL_Q}</div>
            </div>
            <LiveScoreHUD qCount={TOTAL_Q}/>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs opacity-60 mb-0.5">TIME LEFT</div>
                <div className={clsx('font-serif text-2xl font-normal', timerDanger ? 'text-red-400 animate-pulse' : timerWarn ? 'text-yellow-400' : 'text-white')}>{timeRemaining}</div>
              </div>
              <button onClick={paused ? handleResume : handlePause} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                {paused ? <Play size={16} className="text-white"/> : <Pause size={16} className="text-white"/>}
              </button>
              <button onClick={() => setChatOpen(o => !o)} className={clsx('w-9 h-9 rounded-full border flex items-center justify-center transition-colors', chatOpen ? 'bg-blue-600 border-blue-600' : 'border-white/20 hover:bg-white/10')}>
                <MessageCircle size={16} className="text-white"/>
              </button>
              <button onClick={confirmSubmit} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors">Submit</button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-2">
            <div className="h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${(currentIndex / TOTAL_Q) * 100}%` }}/></div>
          </div>
        </div>

        {paused && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-5xl mb-4">⏸</div>
              <h2 className="text-2xl font-serif mb-2">Exam Paused</h2>
              <p className="text-white/60 mb-6">Your progress is saved. Resume when ready.</p>
              <button onClick={handleResume} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 mx-auto transition-colors"><Play size={18}/> Resume Exam</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex flex-wrap gap-1 mb-5">
              {Array.from({ length: Math.min(currentIndex + 1, TOTAL_Q) }).map((_, i) => {
                const ans = answers[i]
                const isCurrentDot = i === currentIndex
                const sub = subjectLabel(i)
                return <div key={i} className={clsx('w-3 h-3 rounded-sm transition-colors', isCurrentDot && 'ring-2 ring-blue-400 ring-offset-1')}
                  style={{ background: isCurrentDot ? subjectColor(sub) : ans ? (ans.chosen === ans.correct ? '#22C55E' : '#EF4444') : 'var(--border)' }}
                  title={`Q${i + 1} - ${sub}`}/>
              })}
            </div>

            {status === 'loading' && !currentQ && (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/>
                <p className="text-sm" style={{ color: 'var(--text2)' }}>Loading next question...</p>
              </div>
            )}

            {currentQ && !paused && <QuestionCard question={currentQ} onAnswer={handleAnswer} answered={isAnswered} chosenIndex={chosenIndex} audioMode={false}/>}

            {isAnswered && currentQ && !paused && (
              <div className="mt-4">
                <button onClick={handleNext} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center gap-2">
                  {currentIndex + 1 >= TOTAL_Q ? '🏁 Submit Exam' : 'Next →'}
                </button>
              </div>
            )}
            <div className="h-16"/>
          </div>
        </div>
      </div>
      <ChatbotSidebar question={isAnswered ? (currentQ ?? null) : null} isOpen={chatOpen} onClose={() => setChatOpen(false)}/>
    </div>
  )
}
