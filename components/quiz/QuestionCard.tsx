'use client'
import { useState } from 'react'
import { Lightbulb, Volume2, VolumeX } from 'lucide-react'
import clsx from 'clsx'
import MathRenderer, { mathToSpeech } from '@/components/ui/MathRenderer'
import type { Question } from '@/types'

interface Props {
  question: Question
  onAnswer: (choiceIndex: number) => void
  answered: boolean
  chosenIndex: number | null
  audioMode?: boolean
}

export default function QuestionCard({ question, onAnswer, answered, chosenIndex, audioMode }: Props) {
  const [showHint, setShowHint] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const isCorrect = chosenIndex === question.correct
  const isMathSci = question.subject === 'Math' || question.subject === 'Science'

  const speak = (text: string, lang: 'en' | 'fil' = 'en') => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(mathToSpeech(text))
    utt.lang = lang === 'fil' ? 'fil-PH' : 'en-US'
    utt.rate = lang === 'fil' ? 0.85 : 0.9
    const voices = window.speechSynthesis.getVoices()
    const preferred = lang === 'fil'
      ? voices.find(v => v.lang.startsWith('fil') || v.name.toLowerCase().includes('filipino'))
      : voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang === 'en-US')
    if (preferred) utt.voice = preferred
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  const handleTTS = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    speak(`Question: ${question.question}. Choice A: ${question.choices[0]}. Choice B: ${question.choices[1]}. Choice C: ${question.choices[2]}. Choice D: ${question.choices[3]}.`, question.language || 'en')
  }

  const parseSteps = (explanation: string): string[] => {
    if (!isMathSci) return []
    const stepPattern = /step\s*\d+:?\s*/gi
    if (!stepPattern.test(explanation)) return []
    return explanation.split(/(?=step\s*\d+)/gi).filter(s => s.trim().length > 2)
  }
  const steps = parseSteps(question.explanation)

  const renderVisual = () => {
    if (!question.hasVisual || !question.visualData) return null
    if (question.visualType === 'svg') {
      return <div className="mt-3 p-3 rounded-lg border overflow-auto" style={{ borderColor: 'var(--border)', background: 'var(--card2)' }} dangerouslySetInnerHTML={{ __html: question.visualData }}/>
    }
    try {
      const chartData = JSON.parse(question.visualData)
      return (
        <div className="mt-3 p-3 rounded-lg text-xs font-mono overflow-auto" style={{ background: 'var(--card2)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>Graph Data:</div>
          <div style={{ color: 'var(--text2)' }}>{JSON.stringify(chartData, null, 2)}</div>
        </div>
      )
    } catch { return null }
  }

  return (
    <div className="animate-slide-up">
      <div className="rounded-2xl border p-6 mb-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text3)' }}>{question.subtopic} — {question.topic}</span>
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', {
            'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300': question.difficulty === 'Easy',
            'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300': question.difficulty === 'Medium',
            'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300': question.difficulty === 'Hard',
          })}>{question.difficulty}</span>
          {question.language === 'fil' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Filipino</span>}
          {question.source === 'cached' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">cached</span>}
          {audioMode !== false && (
            <button onClick={handleTTS} className={clsx('ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors',
              speaking ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}
              style={{ borderColor: speaking ? undefined : 'var(--border)' }}>
              {speaking ? <VolumeX size={12}/> : <Volume2 size={12}/>}{speaking ? 'Stop' : 'Read'}
            </button>
          )}
        </div>

        <p className="text-lg leading-relaxed" style={{ color: 'var(--text)' }}><MathRenderer>{question.question}</MathRenderer></p>
        {renderVisual()}

        {!answered && (
          <button onClick={() => setShowHint(!showHint)} className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors">
            <Lightbulb size={14}/> {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        {showHint && question.hint && (
          <div className="mt-2 px-4 py-3 rounded-lg border-l-4 border-amber-400 text-sm leading-relaxed" style={{ background: '#FDF3DC', color: '#92600A' }}>
            <MathRenderer>{question.hint}</MathRenderer>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 mb-4">
        {question.choices.map((choice, i) => {
          const label = String.fromCharCode(65 + i)
          const isChosen = chosenIndex === i
          const isRightAnswer = i === question.correct
          let stateClass = ''
          if (answered) {
            if (isRightAnswer && chosenIndex !== -1) stateClass = 'choice-correct'
            else if (isChosen && !isRightAnswer) stateClass = 'choice-wrong'
            else if (isRightAnswer && chosenIndex === -1) stateClass = 'choice-reveal'
          }
          return (
            <button key={i} onClick={() => !answered && onAnswer(i)} disabled={answered}
              className={clsx('w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all text-[15px] leading-snug',
                !answered && 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer',
                answered && 'cursor-default', stateClass || 'border-[var(--border)]', !stateClass && 'bg-[var(--card)]')}>
              <span className={clsx('w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors',
                stateClass === 'choice-correct' || stateClass === 'choice-reveal' ? 'bg-green-500 border-green-500 text-white'
                : stateClass === 'choice-wrong' ? 'bg-red-500 border-red-500 text-white' : 'border-[var(--border2)]')}
                style={{ color: stateClass ? undefined : 'var(--text3)' }}>
                {answered && (stateClass === 'choice-correct' || stateClass === 'choice-reveal') ? '✓' : answered && stateClass === 'choice-wrong' ? '✗' : label}
              </span>
              <span className="flex-1" style={{ color: 'var(--text)' }}><MathRenderer>{choice}</MathRenderer></span>
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: isCorrect ? '#F0FDF4' : '#EFF6FF', borderColor: isCorrect ? '#86EFAC' : '#BFDBFE' }}>
          <div className={clsx('text-base font-bold mb-3 flex items-center gap-2 flex-wrap',
            chosenIndex === -1 ? 'text-amber-600 dark:text-amber-400' : isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {chosenIndex === -1 ? "⏰ Time's up!" : isCorrect ? '✅ Correct!' : '❌ Incorrect.'}
            {!isCorrect && chosenIndex !== -1 && (
              <span className="text-sm font-normal" style={{ color: 'var(--text2)' }}>
                Correct: <strong>{String.fromCharCode(65 + question.correct)}. </strong><MathRenderer>{question.choices[question.correct]}</MathRenderer>
              </span>
            )}
          </div>

          {steps.length > 0 ? (
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text)' }}><MathRenderer>{step.replace(/^step\s*\d+:?\s*/i, '').trim()}</MathRenderer></span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}><MathRenderer>{question.explanation}</MathRenderer></p>
          )}

          {audioMode !== false && (
            <button onClick={() => speak(question.explanation, question.language || 'en')} className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              <Volume2 size={12}/> Read explanation
            </button>
          )}
        </div>
      )}
    </div>
  )
}
