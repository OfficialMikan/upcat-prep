'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import { useQuizStore } from '@/store/quizStore'
import { useAISettingsStore } from '@/store/aiSettingsStore'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import QuestionCard from '@/components/quiz/QuestionCard'
import LiveScoreHUD from '@/components/quiz/LiveScoreHUD'
import ChatbotSidebar from '@/components/chat/ChatbotSidebar'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
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
  const { provider, model } = useAISettingsStore()
  const { questions, answers, currentIndex, isAnswered, startSession, pushQuestion, pushPrefetched, shiftPrefetch, recordAnswer, nextQuestion, setStatus, finishSession, status } = store
  const confirmDialog = useConfirmDialog()

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
      const res = await fetch('/api/generate-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...getNextContext(), difficulty: 'Mixed', useLite: true, provider, model }) })
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
      const res = await fetch('/api/generate-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, difficulty: 'Mixed', useLite: true, provider, model }) })
      if (res.status === 429) {
        const data = await res.json() as { waitSecs?: number }
        setTimeout(() => loadNextQuestionRef.current(), (data.waitSecs || 30) * 1000)
        return
      }
      const data = await res.json() as { question: Question }
      if (data.question) { pushQuestion(data.question); prefetchMore() }
    } catch { setTimeout(() => loadNextQuestionRef.current(), 3000) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, model])

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

  const confirmSubmit = async () => {
    const ok = await confirmDialog.confirm({
      title: 'Submit exam?',
      message: `You've answered ${answers.length} of ${TOTAL_Q} questions. Unanswered questions will count as incorrect.`,
      confirmLabel: 'Submit exam',
      cancelLabel: 'Keep going',
      danger: true,
    })
    if (ok) handleFinish()
  }

  const subjectLabel = (idx: number) => SUBJECTS_ORDER[Math.min(Math.floor(idx / Q_PER_SUBJECT), 3)]
  const subjectColor = (sub: Subject) => UPCAT_TOPICS[sub]?.color || '#888'

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 text-white px-4 py-3" style={{ background: '#1A1816' }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-wider opacity-70 mb-0.5">MOCK UPCAT EXAM</div>
              <div className="text-sm opacity-90">{subjectLabel(currentIndex)} Section · Question {currentIndex + 1} of {TOTAL_Q}</div>
            </div>
            <LiveScoreHUD qCount={TOTAL_Q}/>
            <div className="flex items-center gap-3">
              <div className="text-right" role="timer" aria-label={`${timeRemaining} remaining`}>
                <div className="text-xs opacity-70 mb-0.5">TIME LEFT</div>
                <div className={clsx('font-serif text-2xl font-normal', timerDanger ? 'text-red-300 animate-pulse' : timerWarn ? 'text-yellow-300' : 'text-white')}>{timeRemaining}</div>
              </div>
              <button onClick={paused ? handleResume : handlePause} aria-label={paused ? 'Resume exam' : 'Pause exam'} className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1816]">
                {paused ? <Play size={16} className="text-white" aria-hidden="true"/> : <Pause size={16} className="text-white" aria-hidden="true"/>}
              </button>
              <button onClick={() => setChatOpen(o => !o)} aria-label={chatOpen ? 'Close AI tutor chat' : 'Open AI tutor chat'} aria-pressed={chatOpen} className={clsx('w-9 h-9 rounded-full border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1816]', chatOpen ? 'bg-blue-600 border-blue-600' : 'border-white/30 hover:bg-white/10')}>
                <MessageCircle size={16} className="text-white" aria-hidden="true"/>
              </button>
              <button onClick={confirmSubmit} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1816]">Submit</button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-2">
            <div className="h-1 rounded-full bg-white/20 overflow-hidden" role="progressbar" aria-valuenow={Math.round((currentIndex / TOTAL_Q) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Exam progress">
              <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${(currentIndex / TOTAL_Q) * 100}%` }}/>
            </div>
          </div>
        </div>

        {paused && (
          <div className="absolute inset-0 z-40 bg-black/85 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Exam paused">
            <div className="text-center text-white">
              <div className="text-5xl mb-4" aria-hidden="true">⏸</div>
              <h2 className="text-2xl font-serif mb-2">Exam Paused</h2>
              <p className="text-white/80 mb-6">Your progress is saved. Resume when ready.</p>
              <button onClick={handleResume} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 mx-auto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"><Play size={18} aria-hidden="true"/> Resume Exam</button>
            </div>
          </div>
        )}

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex flex-wrap gap-1 mb-5" role="img" aria-label={`Progress: ${answers.length} of ${TOTAL_Q} questions answered`}>
              {Array.from({ length: Math.min(currentIndex + 1, TOTAL_Q) }).map((_, i) => {
                const ans = answers[i]
                const isCurrentDot = i === currentIndex
                const sub = subjectLabel(i)
                return <div key={i} aria-hidden="true" className={clsx('w-3 h-3 rounded-sm transition-colors', isCurrentDot && 'ring-2 ring-blue-400 ring-offset-1')}
                  style={{ background: isCurrentDot ? subjectColor(sub) : ans ? (ans.chosen === ans.correct ? '#22C55E' : '#EF4444') : 'var(--border)' }}
                  title={`Q${i + 1} - ${sub}`}/>
              })}
            </div>

            {status === 'loading' && !currentQ && (
              <div className="flex flex-col items-center py-20 gap-3" role="status" aria-live="polite">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"/>
                <p className="text-sm" style={{ color: 'var(--text)' }}>Loading next question…</p>
              </div>
            )}

            {currentQ && !paused && <QuestionCard question={currentQ} onAnswer={handleAnswer} answered={isAnswered} chosenIndex={chosenIndex} audioMode={false}/>}

            {isAnswered && currentQ && !paused && (
              <div className="mt-4">
                <button onClick={handleNext} className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                  {currentIndex + 1 >= TOTAL_Q ? '🏁 Submit Exam' : 'Next →'}
                </button>
              </div>
            )}
            <div className="h-16"/>
          </div>
        </main>
      </div>
      <ChatbotSidebar question={isAnswered ? (currentQ ?? null) : null} isOpen={chatOpen} onClose={() => setChatOpen(false)}/>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        title={confirmDialog.options?.title || ''}
        message={confirmDialog.options?.message || ''}
        confirmLabel={confirmDialog.options?.confirmLabel}
        cancelLabel={confirmDialog.options?.cancelLabel}
        danger={confirmDialog.options?.danger}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  )
}
