export type Subject = 'Math' | 'Science' | 'Reading' | 'Language'
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed'
export type SessionMode = 'practice' | 'mock' | 'spaced' | 'custom'
export type GradingMode = 'Both' | 'UPG' | 'Percent'

export interface Question {
  id?: string
  subject: Subject
  subtopic: string
  topic: string
  difficulty: Difficulty
  question: string
  choices: string[]
  correct: number
  explanation: string
  hint: string
  hasVisual?: boolean
  visualType?: 'svg' | 'chart' | 'image'
  visualData?: string
  language?: 'en' | 'fil'
  source?: 'ai' | 'custom' | 'cached'
  createdAt?: string
}

export interface Answer {
  questionIndex: number
  chosen: number
  correct: number
  subject: Subject
  topic: string
  subtopic: string
  timeSpent: number
  timedOut: boolean
}

export interface SubjectStats { correct: number; total: number }

export interface SessionRecord {
  id?: string
  mode: SessionMode
  subjects: Subject[]
  difficulty: Difficulty
  correct: number
  total: number
  pct: number
  avgTime: number
  totalTimeSec: number
  upg: number | null
  subStats: Partial<Record<Subject, SubjectStats>>
  createdAt?: string
}

export interface Flashcard {
  id?: string
  subject: Subject
  subtopic: string
  topic: string
  front: string
  back: string
  language?: 'en' | 'fil'
  createdAt?: string
}

export interface QuizConfig {
  subjects: Subject[]
  selectedTopics: Partial<Record<Subject, string[]>>
  qCount: number
  difficulty: Difficulty
  timerSecs: number
  grading: GradingMode
  audioMode: boolean
  includeCustom: boolean
  mode: SessionMode
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
