'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import Header from '@/components/layout/Header'
import { getSessionsFromDB, getTopicStatsFromDB, getAllSRItems, getQuestionCount } from '@/lib/supabase'
import { SUBJECT_LIST } from '@/data/topics'
import clsx from 'clsx'

type Tab = 'overview' | 'trends' | 'weak' | 'sr' | 'history'

interface SessionRow {
  id: string; created_at: string; mode: string; subjects: string[]; difficulty: string
  correct: number; total: number; pct: number; avg_time: number; total_time_sec: number; upg: number | null
  sub_stats: Record<string, { correct: number; total: number }>
}
interface TopicStatRow { id: string; subject: string; subtopic: string; topic: string; correct: number; total: number; accuracy: number; last_seen: string }
interface SRRow { id: string; subject: string; topic: string; subtopic: string; interval: number; ease_factor: number; repetitions: number; next_review: string }

const SUB_COLORS: Record<string, string> = { Math: '#1D4ED8', Science: '#15803D', Reading: '#7C3AED', Language: '#0F766E' }

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [topicStats, setTopicStats] = useState<TopicStatRow[]>([])
  const [srItems, setSrItems] = useState<SRRow[]>([])
  const [cachedQ, setCachedQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
    Promise.all([getSessionsFromDB(50), getTopicStatsFromDB(), getAllSRItems(), getQuestionCount()])
      .then(([s, t, sr, qc]) => {
        setSessions(s as SessionRow[]); setTopicStats(t as TopicStatRow[]); setSrItems(sr as SRRow[]); setCachedQ(qc); setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalQ = sessions.reduce((a, s) => a + (s.total || 0), 0)
  const totalCorrect = sessions.reduce((a, s) => a + (s.correct || 0), 0)
  const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0
  const recentUpg = sessions.slice(0, 5).map(s => s.upg).filter((u): u is number => u !== null)
  const avgUpg = recentUpg.length ? (recentUpg.reduce((a, b) => a + b, 0) / recentUpg.length).toFixed(2) : '—'
  const bestTime = sessions.length ? Math.min(...sessions.map(s => s.avg_time || 999)).toFixed(1) : null

  const streak = (() => {
    if (!sessions.length || !now) return 0
    const days = [...new Set(sessions.map(s => (s.created_at || '').split('T')[0]))].filter(Boolean).sort().reverse()
    const today = new Date(now).toISOString().split('T')[0]
    const yesterday = new Date(now - 86400000).toISOString().split('T')[0]
    if (days[0] !== today && days[0] !== yesterday) return 0
    let st = 1
    for (let i = 1; i < days.length; i++) {
      const diff = Math.round((new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000)
      if (diff === 1) st++
      else break
    }
    return st
  })()

  const subjectAgg: Record<string, { c: number; t: number }> = {}
  sessions.forEach(s => { Object.entries(s.sub_stats || {}).forEach(([sub, st]) => { if (!subjectAgg[sub]) subjectAgg[sub] = { c: 0, t: 0 }; subjectAgg[sub].c += st.correct; subjectAgg[sub].t += st.total }) })
  const subjectChartData = SUBJECT_LIST.map(s => ({ name: s, pct: subjectAgg[s]?.t ? Math.round((subjectAgg[s].c / subjectAgg[s].t) * 100) : 0 }))

  const trendData = [...sessions].slice(0, 15).reverse().map((s, i) => ({ session: `S${i + 1}`, upg: s.upg, avgTime: s.avg_time, pct: s.pct }))
  const weakTopics = [...topicStats].filter(t => t.total >= 2).sort((a, b) => a.accuracy - b.accuracy).slice(0, 15)
  const dueSRItems = srItems.filter(s => new Date(s.next_review).getTime() <= now)

  const TABS: { id: Tab; label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'trends', label: 'Trends' }, { id: 'weak', label: 'Weak Areas' }, { id: 'sr', label: 'SR Queue' }, { id: 'history', label: 'History' }]

  if (loading) return <><Header/><div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/></div></>

  return (
    <>
      <Header/>
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>📊 Dashboard</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>Your progress, weak areas, and performance trends.</p>

        <div className="flex rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={clsx('flex-1 py-2.5 text-sm font-medium transition-colors', tab === t.id ? 'bg-blue-600 text-white' : '')} style={tab !== t.id ? { color: 'var(--text2)', background: 'var(--card)' } : {}}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[{ label: 'Sessions', val: sessions.length }, { label: 'Questions Answered', val: totalQ }, { label: 'Overall Accuracy', val: `${overallPct}%` }, { label: 'Avg UPG (recent)', val: avgUpg }, { label: 'Best Time/Q', val: bestTime ? `${bestTime}s` : '—' }, { label: 'Day Streak', val: `${streak}🔥` }, { label: 'Cached Questions', val: cachedQ }].map(({ label, val }) => (
                <div key={label} className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className="font-serif text-2xl" style={{ color: 'var(--text)' }}>{val}</div>
                  <div className="text-xs uppercase tracking-wide mt-1" style={{ color: 'var(--text3)' }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <h2 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Subject Accuracy</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>All-time average % correct per subject</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text2)' }}/>
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text3)' }}/>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                    <Bar dataKey="pct" radius={[6, 6, 0, 0]}>{subjectChartData.map(d => <Cell key={d.name} fill={SUB_COLORS[d.name]}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {tab === 'trends' && (
          <div className="space-y-5">
            <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <h2 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>UPG Score Over Time</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>Lower is better (1.0 = perfect)</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="session" tick={{ fontSize: 11, fill: 'var(--text3)' }}/>
                    <YAxis domain={[1, 5]} reversed tick={{ fontSize: 11, fill: 'var(--text3)' }}/>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                    <Line type="monotone" dataKey="upg" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 4 }} connectNulls/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <h2 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Avg. Time per Question</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="session" tick={{ fontSize: 11, fill: 'var(--text3)' }}/>
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }}/>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                    <Line type="monotone" dataKey="avgTime" stroke="#15803D" strokeWidth={2} dot={{ r: 4 }} connectNulls/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'weak' && (
          <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Weakest Topics</h2>
            {weakTopics.length === 0 ? <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>Complete a few sessions to see weak areas.</p> : (
              <div className="space-y-3">
                {weakTopics.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="w-40 shrink-0 text-sm" style={{ color: 'var(--text)' }}>{t.topic}<br/><span style={{ color: SUB_COLORS[t.subject] }} className="text-xs">{t.subject}</span></div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}><div className="h-full rounded-full" style={{ width: `${Math.round(t.accuracy)}%`, background: t.accuracy >= 70 ? '#22C55E' : t.accuracy >= 50 ? '#F59E0B' : '#EF4444' }}/></div>
                    <div className="text-sm font-semibold w-10 text-right" style={{ color: 'var(--text)' }}>{Math.round(t.accuracy)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'sr' && (
          <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Spaced Repetition Queue</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>{dueSRItems.length} items due now, of {srItems.length} tracked topics</p>
            <div className="space-y-2">
              {srItems.slice(0, 25).map(item => {
                const isDue = new Date(item.next_review).getTime() <= now
                const daysAway = Math.ceil((new Date(item.next_review).getTime() - now) / 86400000)
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ background: 'var(--card2)' }}>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: SUB_COLORS[item.subject] + '20', color: SUB_COLORS[item.subject] }}>{item.subject}</span>
                    <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{item.topic}</span>
                    <span className={clsx('text-xs font-medium', isDue ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>{isDue ? 'Due now' : `In ${daysAway}d`}</span>
                  </div>
                )
              })}
              {srItems.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>No items tracked yet.</p>}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Session History</h2>
            <div className="space-y-1">
              {sessions.map(s => {
                const d = new Date(s.created_at)
                return (
                  <div key={s.id} className="flex justify-between items-center py-2.5 border-b last:border-0 text-sm" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text)' }}>{d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} {d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-xs" style={{ color: 'var(--text3)' }}>{(s.subjects || []).join(', ')} · {s.difficulty} · {s.mode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" style={{ color: 'var(--text)' }}>{s.pct}%{s.upg ? ` — UPG ${s.upg}` : ''}</div>
                      <div className="text-xs" style={{ color: 'var(--text3)' }}>{s.correct}/{s.total} · {s.avg_time}s/Q</div>
                    </div>
                  </div>
                )
              })}
              {sessions.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>No sessions yet.</p>}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
