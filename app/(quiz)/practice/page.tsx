'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, ArrowLeft, ChevronRight, Flag } from 'lucide-react'
import clsx from 'clsx'
import { useQuizStore } from '@/store/quizStore'
import { useAISettingsStore } from '@/store/aiSettingsStore'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import QuestionCard from '@/components/quiz/QuestionCard'
import LiveScoreHUD from '@/components/quiz/LiveScoreHUD'
import Timer from '@/components/quiz/Timer'
import ChatbotSidebar from '@/components/chat/ChatbotSidebar'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Question, Subject, Answer, QuizConfig } from '@/types'
import { UPCAT_TOPICS } from '@/data/topics'
import { upsertTopicStat, upsertSRItem } from '@/lib/supabase'

function getNextContext(config: QuizConfig, idx: number) {
  const subjects = config.subjects.length ? config.subjects : ['Math', 'Science', 'Reading', 'Language'] as Subject[]
  const sub = subjects[idx % subjects.length]
  const subData = UPCAT_TOPICS[sub]
  const selTopics = config.selectedTopics[sub] || []
  const isAll = !selTopics.length
  let candidates: { subtopic: string; topic: string }[]
  if (isAll) {
    candidates = subData.subtopics.flatMap(st => st.topics.map(t => ({ subtopic: st.subtopic, topic: t })))
  } else {
    candidates = subData.subtopics.filter(st => selTopics.includes(st.subtopic)).flatMap(st => st.topics.map(t => ({ subtopic: st.subtopic, topic: t })))
    if (!candidates.length) candidates = subData.subtopics.flatMap(st => st.topics.map(t => ({ subtopic: st.subtopic, topic: t })))
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return { subject: sub, subtopic: pick.subtopic, topic: pick.topic }
}

export default function PracticePage() {
  const router = useRouter()
  const store = useQuizStore()
  const { provider, model } = useAISettingsStore()
  const {
    config, questions, currentIndex, isAnswered,
    startSession, pushQuestion, pushPrefetched, shiftPrefetch,
    recordAnswer, nextQuestion, setStatus, finishSession, status, errorMessage,
  } = store
  const confirmDialog = useConfirmDialog()

  const [chosenIndex, setChosenIndex] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [waitSecs, setWaitSecs] = useState(0)
  const waitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prefetchingRef = useRef(false)
  const initRef = useRef(false)

  const currentQ: Question | undefined = questions[currentIndex]

  const prefetch = useCallback(async (count = 2) => {
    if (prefetchingRef.current) return
    prefetchingRef.current = true
    try {
      for (let i = 0; i < count; i++) {
        const ctx = getNextContext(config, useQuizStore.getState().questions.length + useQuizStore.getState().prefetchQueue.length)
        const res = await fetch('/api/generate-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ctx, difficulty: config.difficulty, provider, model }) })
        if (res.ok) {
          const data = await res.json() as { question: Question }
          if (data.question) pushPrefetched(data.question)
        }
      }
    } catch { /* silent */ }
    prefetchingRef.current = false
  }, [config.difficulty, config.subjects, config.selectedTopics, pushPrefetched, provider, model])

  const loadNextQuestionRef = useRef<(attempt?: number) => Promise<void>>(async () => {})

  const loadNextQuestion = useCallback(async (attempt = 0) => {
    setStatus('loading')
    setChosenIndex(null)
    const prefetched = shiftPrefetch()
    if (prefetched) {
      pushQuestion(prefetched)
      setTimerKey(k => k + 1)
      setTimeout(() => prefetch(2), 500)
      return
    }
    const ctx = getNextContext(config, useQuizStore.getState().questions.length)
    try {
      const res = await fetch('/api/generate-question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: ctx.subject, subtopic: ctx.subtopic, topic: ctx.topic, difficulty: config.difficulty, useLite: retryCount > 1, provider, model }),
      })
      if (res.status === 429) {
        const data = await res.json() as { waitSecs?: number }
        const secs = data.waitSecs || 60
        setWaitSecs(secs)
        setStatus('error', `Rate limit hit. Auto-retrying in ${secs}s. App switched to a faster model.`)
        window.dispatchEvent(new CustomEvent('upcat:model-switch', { detail: { lite: true } }))
        if (waitIntervalRef.current) clearInterval(waitIntervalRef.current)
        let remaining = secs
        waitIntervalRef.current = setInterval(() => {
          remaining--
          setWaitSecs(remaining)
          if (remaining <= 0) {
            clearInterval(waitIntervalRef.current!)
            setRetryCount(r => r + 1)
            loadNextQuestionRef.current(attempt + 1)
          }
        }, 1000)
        return
      }
      if (res.status === 422) {
        if (attempt < 3) setTimeout(() => loadNextQuestionRef.current(attempt + 1), 300)
        else setStatus('error', 'Content blocked by safety filter. Please try a different topic.')
        return
      }
      if (res.status === 401) {
        const data = await res.json() as { message?: string }
        setStatus('error', data.message || 'API key missing or invalid. Please check Setup.')
        return
      }
      if (!res.ok) {
        const data = await res.json() as { message?: string }
        throw new Error(data.message || `HTTP ${res.status}`)
      }
      const data = await res.json() as { question: Question }
      if (!data.question) throw new Error('No question returned')
      pushQuestion(data.question)
      setTimerKey(k => k + 1)
      setRetryCount(0)
      setTimeout(() => prefetch(2), 800)
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Unknown error')
    }
  }, [config.difficulty, retryCount, setStatus, shiftPrefetch, pushQuestion, prefetch, provider, model])

  useEffect(() => { loadNextQuestionRef.current = loadNextQuestion }, [loadNextQuestion])

  useEffect(() => {
    if (initRef.current) return
    if (config.mode !== 'practice' && config.mode !== 'spaced' && config.mode !== 'custom') { router.replace('/'); return }
    if (config.subjects.length === 0 && config.mode !== 'custom') { router.replace('/'); return }
    initRef.current = true
    startSession()
    loadNextQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAnswer = useCallback((chosen: number) => {
    if (isAnswered || !currentQ) return
    setChosenIndex(chosen)
    const timeSpent = Math.round((Date.now() - useQuizStore.getState().questionStartTime) / 1000)
    const isCorrect = chosen === currentQ.correct
    const answer: Answer = { questionIndex: currentIndex, chosen, correct: currentQ.correct, subject: currentQ.subject, topic: currentQ.topic, subtopic: currentQ.subtopic, timeSpent, timedOut: false }
    recordAnswer(answer, isCorrect)
    upsertTopicStat(currentQ.subject, currentQ.subtopic, currentQ.topic, isCorrect).catch(() => {})
    upsertSRItem(currentQ.subject, currentQ.topic, currentQ.subtopic, isCorrect).catch(() => {})
  }, [isAnswered, currentQ, currentIndex, recordAnswer])

  const handleTimerExpire = useCallback(() => {
    if (isAnswered || !currentQ) return
    setChosenIndex(-1)
    const answer: Answer = { questionIndex: currentIndex, chosen: -1, correct: currentQ.correct, subject: currentQ.subject, topic: currentQ.topic, subtopic: currentQ.subtopic, timeSpent: config.timerSecs, timedOut: true }
    recordAnswer(answer, false)
    upsertTopicStat(currentQ.subject, currentQ.subtopic, currentQ.topic, false).catch(() => {})
    upsertSRItem(currentQ.subject, currentQ.topic, currentQ.subtopic, false).catch(() => {})
  }, [isAnswered, currentQ, currentIndex, config.timerSecs, recordAnswer])

  const handleFinish = useCallback(() => {
    const result = finishSession()
    if (result) sessionStorage.setItem('upcat_last_result', JSON.stringify(result))
    router.push('/results')
  }, [finishSession, router])

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= config.qCount) { handleFinish(); return }
    nextQuestion()
    loadNextQuestion()
  }, [currentIndex, config.qCount, handleFinish, nextQuestion, loadNextQuestion])

  const confirmExit = async () => {
    const ok = await confirmDialog.confirm({
      title: 'Exit session?',
      message: 'Your current progress in this session will be lost.',
      confirmLabel: 'Exit session',
      cancelLabel: 'Keep going',
      danger: true,
    })
    if (ok) router.push('/')
  }

  const progress = config.qCount > 0 ? (currentIndex / config.qCount) * 100 : 0
  const isLastQuestion = currentIndex + 1 >= config.qCount && isAnswered
  const subjectData = currentQ ? UPCAT_TOPICS[currentQ.subject] : null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 border-b px-4 py-2.5 flex items-center justify-between gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={confirmExit}
              aria-label="Exit practice session"
              className="flex items-center gap-1 text-sm hover:text-red-500 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 px-1 -mx-1"
              style={{ color: 'var(--text2)' }}
            >
              <ArrowLeft size={16} aria-hidden="true"/><span className="hidden sm:block">Exit</span>
            </button>
            <div className="h-4 w-px" style={{ background: 'var(--border)' }} aria-hidden="true"/>
            {subjectData && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: subjectData.bg, color: subjectData.color }}>{subjectData.icon} {currentQ?.subject}</span>}
            <span className="text-sm font-semibold" style={{ color: 'var(--text2)' }}>
              <span className="sr-only">Question </span>{currentIndex + 1} / {config.qCount}
            </span>
          </div>
          <LiveScoreHUD qCount={config.qCount}/>
          <div className="flex items-center gap-2">
            <Timer key={timerKey} totalSeconds={config.timerSecs} onExpire={handleTimerExpire} paused={isAnswered}/>
            <button onClick={() => setChatOpen(o => !o)}
              aria-label={chatOpen ? 'Close AI tutor chat' : 'Open AI tutor chat'}
              aria-pressed={chatOpen}
              className={clsx('w-9 h-9 rounded-full flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2', chatOpen ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}
              style={!chatOpen ? { borderColor: 'var(--border)', color: 'var(--text2)' } : {}}
            >
              <MessageCircle size={16} aria-hidden="true"/>
            </button>
          </div>
        </div>

        <div className="h-1 shrink-0" style={{ background: 'var(--border)' }} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Session progress">
          <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}/>
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {status === 'loading' && !currentQ && (
              <div className="flex flex-col items-center justify-center py-20 gap-4" role="status" aria-live="polite">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"/>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{retryCount > 0 ? 'Switching to a faster model…' : 'Generating question with AI…'}</p>
                <p className="text-xs" style={{ color: 'var(--text2)' }}>Next questions are being pre-loaded in the background</p>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-2xl border p-6 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} role="alert">
                <div className="text-4xl mb-3" aria-hidden="true">⚠️</div>
                <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Failed to generate question</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text)' }}>{errorMessage}</p>
                {waitSecs > 0 ? (
                  <div className="text-sm text-amber-700 dark:text-amber-400">Auto-retrying in {waitSecs}s… (switched to a faster model)</div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => loadNextQuestion()} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">🔄 Retry</button>
                    <button onClick={() => router.push('/setup')} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>⚙️ Setup</button>
                  </div>
                )}
              </div>
            )}

            {currentQ && status !== 'loading' && (
              <QuestionCard question={currentQ} onAnswer={handleAnswer} answered={isAnswered} chosenIndex={chosenIndex} audioMode={config.audioMode}/>
            )}

            {isAnswered && currentQ && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {isLastQuestion ? (
                  <button onClick={handleFinish} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"><Flag size={16} aria-hidden="true"/> Finish &amp; See Results</button>
                ) : (
                  <button onClick={handleNext} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Next Question <ChevronRight size={16} aria-hidden="true"/></button>
                )}
                {!isLastQuestion && currentIndex >= 2 && (
                  <button onClick={handleFinish} className="px-4 py-3 rounded-xl border text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Finish Early</button>
                )}
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
