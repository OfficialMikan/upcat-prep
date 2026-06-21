'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import clsx from 'clsx'

interface Props { totalSeconds: number; onExpire: () => void; paused?: boolean; className?: string }

/** Pass a fresh `key` prop from the parent when starting a new question so this remounts cleanly. */
export default function Timer({ totalSeconds, onExpire, paused, className }: Props) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onExpireRef = useRef(onExpire)
  const circumference = 2 * Math.PI * 20

  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  const tick = useCallback(() => {
    setRemaining(prev => {
      if (prev <= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        onExpireRef.current()
        return 0
      }
      return prev - 1
    })
  }, [])

  useEffect(() => {
    if (paused || totalSeconds === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [paused, totalSeconds, tick])

  const pct = totalSeconds > 0 ? remaining / totalSeconds : 1
  const offset = circumference * (1 - pct)
  const isWarn = pct < 0.5
  const isDanger = pct < 0.25
  const strokeColor = isDanger ? '#EF4444' : isWarn ? '#F59E0B' : '#3B82F6'

  if (totalSeconds === 0) {
    return (
      <div className={clsx('w-12 h-12 flex items-center justify-center rounded-full border-2', className)} style={{ borderColor: 'var(--border)' }}>
        <span style={{ color: 'var(--text3)' }} className="text-lg">∞</span>
      </div>
    )
  }

  return (
    <div className={clsx('relative w-12 h-12 shrink-0', isDanger && 'animate-pulse', className)}>
      <svg viewBox="0 0 44 44" className="-rotate-90 w-full h-full">
        <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border)" strokeWidth="3"/>
        <circle cx="22" cy="22" r="20" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}/>
      </svg>
      <div className={clsx('absolute inset-0 flex items-center justify-center text-sm font-bold', isDanger ? 'text-red-500' : isWarn ? 'text-amber-500' : '')}
        style={{ color: isDanger || isWarn ? undefined : 'var(--text)' }}>
        {remaining}
      </div>
    </div>
  )
}
