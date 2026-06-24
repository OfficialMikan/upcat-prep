'use client'
import { useState, useId } from 'react'
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
  const questionId = useId()
  const hintId = useId()

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
      return <div className="mt-3 p-3 rounded-lg border overflow-auto" style={{ borderColor: 'var(--border)', background: 'var(--card2)' }} dangerouslySetInnerHTML={{ __html: question.visualData }} role="img" aria-label="Diagram for this question"/>
    }
    try {
      const chartData = JSON.parse(question.visualData)
      return (
        <div className="mt-3 p-3 rounded-lg text-xs font-mono overflow-auto" style={{ background: 'var(--card2)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text2)' }}>Graph Data:</div>
          <div style={{ color: 'var(--text2)' }}>{JSON.stringify(chartData, null, 2)}</div>
        </div>
      )
    } catch { return null }
  }

  // Build a screen-reader-friendly result string, since the visual state
  // (color, checkmark) alone isn't perceivable to non-sighted users.
  const resultAnnouncement = answered
    ? chosenIndex === -1
      ? `Time's up. The correct answer was ${String.fromCharCode(65 + question.correct)}.`
      : isCorrect
        ? 'Correct!'
        : `Incorrect. You chose ${String.fromCharCode(65 + (chosenIndex ?? 0))}. The correct answer is ${String.fromCharCode(65 + question.correct)}.`
    : ''

  return (
    <div className="animate-slide-up">
      <div className="rounded-2xl border p-6 mb-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text2)' }}>{question.subtopic} — {question.topic}</span>
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', {
            'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300': question.difficulty === 'Easy',
            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': question.difficulty === 'Medium',
            'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300': question.difficulty === 'Hard',
          })}>
            <span className="sr-only">Difficulty: </span>{question.difficulty}
          </span>
          {question.language === 'fil' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"><span className="sr-only">Language: </span>Filipino</span>}
          {question.source === 'cached' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">cached</span>}
          {audioMode !== false && (
            <button
              onClick={handleTTS}
              aria-pressed={speaking}
              aria-label={speaking ? 'Stop reading question aloud' : 'Read question and choices aloud'}
              className={clsx('ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                speaking ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}
              style={{ borderColor: speaking ? undefined : 'var(--border)', color: speaking ? undefined : 'var(--text)' }}
            >
              {speaking ? <VolumeX size={12} aria-hidden="true"/> : <Volume2 size={12} aria-hidden="true"/>}
              <span>{speaking ? 'Stop' : 'Read'}</span>
            </button>
          )}
        </div>

        <p id={questionId} className="text-lg leading-relaxed" style={{ color: 'var(--text)' }}><MathRenderer>{question.question}</MathRenderer></p>
        {renderVisual()}

        {!answered && (
          <button
            onClick={() => setShowHint(!showHint)}
            aria-expanded={showHint}
            aria-controls={hintId}
            className="mt-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:text-amber-800 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 -mx-1 px-1"
          >
            <Lightbulb size={14} aria-hidden="true"/> {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        {showHint && question.hint && (
          <div id={hintId} className="mt-2 px-4 py-3 rounded-lg border-l-4 border-amber-500 text-sm leading-relaxed" style={{ background: '#FDF3DC', color: '#7A4F08' }}>
            <MathRenderer>{question.hint}</MathRenderer>
          </div>
        )}
      </div>

      {/* Live region announces the result for screen reader / low-vision users without relying on color alone */}
      {answered && <p className="sr-only" role="status">{resultAnnouncement}</p>}

      <div role="radiogroup" aria-labelledby={questionId} className="flex flex-col gap-2.5 mb-4">
        {question.choices.map((choice, i) => {
          const label = String.fromCharCode(65 + i)
          const isChosen = chosenIndex === i
          const isRightAnswer = i === question.correct
          let stateClass = ''
          let stateLabel = ''
          if (answered) {
            if (isRightAnswer && chosenIndex !== -1) { stateClass = 'choice-correct'; stateLabel = ' — correct answer' }
            else if (isChosen && !isRightAnswer) { stateClass = 'choice-wrong'; stateLabel = ' — your answer, incorrect' }
            else if (isRightAnswer && chosenIndex === -1) { stateClass = 'choice-reveal'; stateLabel = ' — correct answer' }
          }
          return (
            <button
              key={i}
              role="radio"
              aria-checked={isChosen}
              aria-label={`Choice ${label}: ${choice}${stateLabel}`}
              onClick={() => !answered && onAnswer(i)}
              disabled={answered}
              className={clsx('w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all text-[15px] leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                !answered && 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer',
                answered && 'cursor-default', stateClass || 'border-[var(--border)]', !stateClass && 'bg-[var(--card)]')}
            >
              <span className={clsx('w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors',
                stateClass === 'choice-correct' || stateClass === 'choice-reveal' ? 'bg-green-600 border-green-600 text-white'
                : stateClass === 'choice-wrong' ? 'bg-red-600 border-red-600 text-white' : 'border-[var(--border2)]')}
                style={{ color: stateClass ? undefined : 'var(--text2)' }}
                aria-hidden="true"
              >
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
            chosenIndex === -1 ? 'text-amber-700 dark:text-amber-400' : isCorrect ? 'text-green-800 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
            <span aria-hidden="true">{chosenIndex === -1 ? "⏰ Time's up!" : isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</span>
            {!isCorrect && chosenIndex !== -1 && (
              <span className="text-sm font-normal" style={{ color: 'var(--text)' }}>
                Correct: <strong>{String.fromCharCode(65 + question.correct)}. </strong><MathRenderer>{question.choices[question.correct]}</MathRenderer>
              </span>
            )}
          </div>

          {steps.length > 0 ? (
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start list-none">
                  <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{i + 1}</span>
                  <span className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text)' }}><MathRenderer>{step.replace(/^step\s*\d+:?\s*/i, '').trim()}</MathRenderer></span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}><MathRenderer>{question.explanation}</MathRenderer></p>
          )}

          {audioMode !== false && (
            <button onClick={() => speak(question.explanation, question.language || 'en')} className="mt-3 text-xs text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1">
              <Volume2 size={12} aria-hidden="true"/> Read explanation aloud
            </button>
          )}
        </div>
      )}
    </div>
  )
}
