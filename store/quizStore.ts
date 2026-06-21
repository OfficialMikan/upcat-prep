'use client'
import { create } from 'zustand'
import type { Question, Answer, QuizConfig, Subject, Difficulty } from '@/types'
import { calcUPG } from '@/data/topics'

interface QuizState {
  config: QuizConfig
  setConfig: (c: Partial<QuizConfig>) => void
  questions: Question[]
  answers: Answer[]
  currentIndex: number
  startTime: number
  questionStartTime: number
  liveCorrect: number
  liveWrong: number
  isAnswered: boolean
  prefetchQueue: Question[]
  mockEndTime: number | null
  mockPaused: boolean
  mockRemainingMs: number | null
  status: 'idle' | 'loading' | 'active' | 'answered' | 'finished' | 'error'
  errorMessage: string | null

  startSession: () => void
  pushQuestion: (q: Question) => void
  pushPrefetched: (q: Question) => void
  shiftPrefetch: () => Question | null
  recordAnswer: (answer: Answer, correct: boolean) => void
  nextQuestion: () => void
  setStatus: (s: QuizState['status'], err?: string) => void
  pauseMock: (remainingMs: number) => void
  resumeMock: () => void
  finishSession: () => SessionResult | null
}

export interface SessionResult {
  mode: string; subjects: Subject[]; difficulty: Difficulty
  correct: number; total: number; pct: number; avgTime: number; totalTimeSec: number
  upg: number | null; subStats: Record<string, { correct: number; total: number }>
  answers: Answer[]; questions: Question[]
}

const DEFAULT_CONFIG: QuizConfig = {
  subjects: [], selectedTopics: {}, qCount: 10, difficulty: 'Mixed',
  timerSecs: 0, grading: 'Both', audioMode: false, includeCustom: false, mode: 'practice',
}

export const useQuizStore = create<QuizState>()((set, get) => ({
  config: DEFAULT_CONFIG,
  setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),

  questions: [], answers: [], currentIndex: 0,
  startTime: 0, questionStartTime: 0,
  liveCorrect: 0, liveWrong: 0, isAnswered: false,
  prefetchQueue: [], mockEndTime: null, mockPaused: false, mockRemainingMs: null,
  status: 'idle', errorMessage: null,

  startSession: () => set({
    questions: [], answers: [], currentIndex: 0,
    startTime: Date.now(), questionStartTime: Date.now(),
    liveCorrect: 0, liveWrong: 0, isAnswered: false,
    prefetchQueue: [], mockEndTime: null, mockPaused: false, mockRemainingMs: null,
    status: 'loading', errorMessage: null,
  }),

  pushQuestion: (q) => set(s => ({ questions: [...s.questions, q], questionStartTime: Date.now(), isAnswered: false, status: 'active' })),
  pushPrefetched: (q) => set(s => ({ prefetchQueue: [...s.prefetchQueue, q] })),
  shiftPrefetch: () => {
    const { prefetchQueue } = get()
    if (!prefetchQueue.length) return null
    const [first, ...rest] = prefetchQueue
    set({ prefetchQueue: rest })
    return first
  },
  recordAnswer: (answer, correct) => set(s => ({
    answers: [...s.answers, answer],
    liveCorrect: s.liveCorrect + (correct ? 1 : 0),
    liveWrong: s.liveWrong + (correct ? 0 : 1),
    isAnswered: true, status: 'answered',
  })),
  nextQuestion: () => set(s => ({ currentIndex: s.currentIndex + 1, isAnswered: false, status: 'loading' })),
  setStatus: (status, errorMessage) => set({ status, errorMessage: errorMessage || null }),
  pauseMock: (remainingMs) => set({ mockPaused: true, mockRemainingMs: remainingMs }),
  resumeMock: () => set(s => ({
    mockPaused: false,
    mockEndTime: s.mockRemainingMs ? Date.now() + s.mockRemainingMs : s.mockEndTime,
    mockRemainingMs: null,
  })),
  finishSession: () => {
    const s = get()
    const { answers, questions, config, startTime } = s
    if (!answers.length) return null
    const correct = answers.filter(a => a.chosen === a.correct).length
    const total = answers.length
    const pct = Math.round((correct / total) * 100)
    const avgTime = total > 0 ? parseFloat((answers.reduce((acc, a) => acc + a.timeSpent, 0) / total).toFixed(1)) : 0
    const totalTimeSec = Math.round((Date.now() - startTime) / 1000)
    const subStats: Record<string, { correct: number; total: number }> = {}
    answers.forEach(a => {
      if (!subStats[a.subject]) subStats[a.subject] = { correct: 0, total: 0 }
      subStats[a.subject].total++
      if (a.chosen === a.correct) subStats[a.subject].correct++
    })
    const upg = calcUPG(subStats as Record<Subject, { correct: number; total: number }>)
    set({ status: 'finished' })
    return { mode: config.mode, subjects: config.subjects, difficulty: config.difficulty, correct, total, pct, avgTime, totalTimeSec, upg, subStats, answers, questions }
  },
}))
