'use client'
import { useQuizStore } from '@/store/quizStore'
import clsx from 'clsx'

interface Props { qCount: number }

export default function LiveScoreHUD({ qCount }: Props) {
  const { liveCorrect, liveWrong, currentIndex } = useQuizStore()
  const answered = liveCorrect + liveWrong
  const pct = answered > 0 ? Math.round((liveCorrect / answered) * 100) : null

  return (
    <div className="flex items-center gap-3 text-sm font-semibold">
      <span style={{ color: 'var(--text3)' }} className="hidden sm:block text-xs font-normal">Q{currentIndex + 1}/{qCount}</span>
      <div className="flex items-center gap-1.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full">
        <span className="text-base leading-none">✓</span><span>{liveCorrect}</span>
      </div>
      <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full">
        <span className="text-base leading-none">✗</span><span>{liveWrong}</span>
      </div>
      {pct !== null && (
        <div className={clsx('px-2 py-0.5 rounded-full text-xs font-bold hidden sm:block',
          pct >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
          : pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300')}>
          {pct}%
        </div>
      )}
    </div>
  )
}
