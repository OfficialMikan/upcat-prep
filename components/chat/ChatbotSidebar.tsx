'use client'
import { useState, useRef, useEffect, useId } from 'react'
import { Send, X, Bot } from 'lucide-react'
import clsx from 'clsx'
import MathRenderer from '@/components/ui/MathRenderer'
import { useAISettingsStore } from '@/store/aiSettingsStore'
import type { Question, ChatMessage } from '@/types'

interface Props { question: Question | null; isOpen: boolean; onClose: () => void }

const QUICK_PROMPTS = ['Explain step by step', 'Why is this the answer?', 'Give a similar example', 'What formula is used?', 'Explain in Filipino']

export default function ChatbotSidebar({ question, isOpen, onClose }: Props) {
  const { provider, model } = useAISettingsStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const headingId = useId()

  useEffect(() => {
    setMessages([])
    setError(null)
  }, [question?.question])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Move focus into the panel when it opens, for keyboard users
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 350) // after slide-in transition
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || !question || loading) return
    setInput('')
    setError(null)
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: 0 }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: { question: question.question, choices: question.choices, correct: question.correct, explanation: question.explanation, subject: question.subject, topic: question.topic },
          userMessage: msg, history: messages.slice(-6), provider, model,
        }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      if (!res.ok && !data.reply) {
        setError(data.error === 'no_key' ? 'No AI provider configured yet. Go to Setup to add an API key.' : 'The AI tutor hit an error. Please try again.')
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Sorry, I couldn't respond. Try again.", timestamp: 0 }])
    } catch {
      setError('Connection error — check your internet connection.')
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.', timestamp: 0 }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} aria-hidden="true"/>}

      {/*
        Fix: previously this used `lg:hidden` alongside a translate-x transition.
        `display:none` cannot be transitioned, so on desktop the panel never
        visibly animated in — clicking the toggle appeared to do nothing.
        Now we always keep it in the layout and only animate transform +
        opacity, with pointer-events disabled while closed so it doesn't
        intercept clicks/tab focus when hidden off-screen.
      */}
      <aside
        aria-hidden={!isOpen}
        aria-labelledby={headingId}
        className={clsx(
          'fixed right-0 top-14 h-[calc(100vh-3.5rem)] z-50 flex flex-col transition-all duration-300 w-[340px] lg:w-[320px]',
          'lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]',
          isOpen ? 'translate-x-0 opacity-100 shadow-2xl pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'
        )}
        style={{ background: 'var(--card)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center" aria-hidden="true"><Bot size={14} className="text-white"/></div>
            <div>
              <h2 id={headingId} className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Tutor</h2>
              {question && <div className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text2)' }}>{question.subject} — {question.topic}</div>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close AI tutor chat" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <X size={16} style={{ color: 'var(--text2)' }} aria-hidden="true"/>
          </button>
        </div>

        {question && messages.length === 0 && (
          <div className="px-3 py-2 flex gap-1.5 flex-wrap border-b shrink-0" style={{ borderColor: 'var(--border)' }} role="group" aria-label="Suggested questions">
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => sendMessage(p)} className="text-xs px-2.5 py-1 rounded-full border hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>{p}</button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
          {!question ? (
            <div className="text-center py-12"><div className="text-4xl mb-3" aria-hidden="true">🤖</div><p className="text-sm" style={{ color: 'var(--text2)' }}>Answer a question to start chatting with your AI tutor.</p></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8"><div className="text-3xl mb-2" aria-hidden="true">💬</div><p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Ask me anything about this question!</p><p className="text-xs" style={{ color: 'var(--text2)' }}>Try the quick buttons above or type your own question.</p></div>
          ) : null}

          {messages.map((msg, i) => (
            <div key={i} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1" aria-hidden="true"><Bot size={12} className="text-white"/></div>}
              <div className={clsx('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'rounded-bl-sm border')}
                style={msg.role === 'assistant' ? { background: 'var(--card2)', borderColor: 'var(--border)', color: 'var(--text)' } : {}}>
                <span className="sr-only">{msg.role === 'user' ? 'You said: ' : 'AI tutor said: '}</span>
                {msg.role === 'assistant' ? <MathRenderer>{msg.content}</MathRenderer> : msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start" role="status" aria-label="AI tutor is typing">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1" aria-hidden="true"><Bot size={12} className="text-white"/></div>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 border" style={{ background: 'var(--card2)', borderColor: 'var(--border)' }}>
                <div className="flex gap-1" aria-hidden="true">{[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>)}</div>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-red-700 dark:text-red-400 text-center">{error}</p>
          )}

          <div ref={bottomRef}/>
        </div>

        <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--card2)' }}>
          <label htmlFor="chat-input" className="sr-only">Message the AI tutor</label>
          <div className="flex gap-2 items-end">
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!question || loading}
              placeholder={question ? 'Ask about this question...' : 'Answer a question first'}
              rows={1}
              className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', maxHeight: '100px' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || !question || loading} aria-label="Send message" className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              <Send size={15} className="text-white" aria-hidden="true"/>
            </button>
          </div>
          <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text2)' }}>Enter to send · Shift+Enter for new line</p>
        </div>
      </aside>
    </>
  )
}
