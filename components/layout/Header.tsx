'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon, Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

const NAV = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/flashcards', label: 'Flashcards', icon: '🃏' },
  { href: '/reference', label: 'Quick Ref', icon: '📚' },
  { href: '/setup', label: 'Setup', icon: '⚙️' },
]

export default function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'missing'>('checking')
  const [modelLabel, setModelLabel] = useState('Flash 2.5')
  const [isLite, setIsLite] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('upcat_api_configured')
    setApiStatus(stored === 'true' ? 'ok' : 'missing')
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ lite: boolean }>).detail
      setIsLite(detail.lite)
      setModelLabel(detail.lite ? 'Flash-Lite ↓' : 'Flash 2.5')
    }
    window.addEventListener('upcat:model-switch', handler)
    return () => window.removeEventListener('upcat:model-switch', handler)
  }, [])

  if (pathname.startsWith('/practice') || pathname.startsWith('/mock')) return null

  return (
    <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="bg-blue-700 text-white text-xs font-serif px-2.5 py-1 rounded-md tracking-wide">UP</span>
          <span className="font-serif text-xl hidden sm:block" style={{ color: 'var(--text)' }}>UPCAT PREP</span>
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 justify-center">
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                pathname === href ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}
              style={{ color: pathname === href ? undefined : 'var(--text2)' }}>
              <span className="text-base leading-none">{icon}</span>
              <span className="hidden md:block">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:block',
            isLite ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300')}>
            {modelLabel}
          </span>

          {mounted && (
            <Link href="/setup" title="API Status" className={clsx('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors',
              apiStatus === 'ok' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
              : apiStatus === 'missing' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 animate-pulse'
              : 'bg-gray-100 text-gray-500 border-gray-200')}>
              {apiStatus === 'ok' ? <CheckCircle size={12}/> : apiStatus === 'missing' ? <AlertTriangle size={12}/> : <Zap size={12}/>}
              <span className="hidden sm:block">{apiStatus === 'ok' ? 'API Ready' : apiStatus === 'missing' ? 'Setup API' : '...'}</span>
            </Link>
          )}

          {mounted && (
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 rounded-full flex items-center justify-center border transition-colors hover:scale-110"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }} title="Toggle theme">
              {theme === 'dark' ? <Sun size={15} className="text-amber-400"/> : <Moon size={15} className="text-slate-600"/>}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
