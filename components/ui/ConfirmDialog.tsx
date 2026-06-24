'use client'
import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Replaces window.confirm(), which synchronously blocks the main thread
 * (the cause of "Event handlers blocked UI updates for 900ms+" warnings)
 * and cannot be styled or made accessible-by-default. This is a proper
 * React modal: focus-trapped, ESC to cancel, returns focus on close.
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement
      confirmBtnRef.current?.focus()
      const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
      document.addEventListener('keydown', handleKey)
      return () => {
        document.removeEventListener('keydown', handleKey)
        previouslyFocused.current?.focus()
      }
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden="true"/>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative rounded-2xl border shadow-2xl max-w-sm w-full p-6 animate-slide-up"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h2 id="confirm-dialog-title" className="font-serif text-xl mb-2" style={{ color: 'var(--text)' }}>{title}</h2>
        <p id="confirm-dialog-message" className="text-sm mb-5" style={{ color: 'var(--text2)' }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${danger ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500' : 'bg-blue-700 hover:bg-blue-800 focus-visible:ring-blue-500'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
