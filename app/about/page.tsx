import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { UPCAT_TOPICS, SUBJECT_LIST } from '@/data/topics'

export const metadata: Metadata = {
  title: 'How It Works — UPCAT PREP',
  description: 'Learn how UPCAT PREP generates questions, tracks your progress, and helps you prepare for the UPCAT exam.',
}

const STEPS = [
  {
    n: 1,
    title: 'Pick a mode and subjects',
    body: 'Choose Practice (custom subjects, difficulty, timer), Mock UPCAT (the full 180-question, 3-hour simulation), Spaced Review (AI resurfaces your weak topics), or quiz yourself on questions you uploaded.',
  },
  {
    n: 2,
    title: 'AI generates a question for you',
    body: 'An AI provider (Gemini, Groq, or ChatGPT — your choice) writes a fresh, UPCAT-style multiple-choice question for the exact subtopic you\'re practicing. If a similar question was generated before, we reuse it from the database instantly instead of asking the AI again.',
  },
  {
    n: 3,
    title: 'Answer, get a hint, or ask the AI tutor',
    body: 'Stuck? Tap "Show hint" for a nudge without giving away the answer, or open the AI Tutor chat in the sidebar after answering to ask follow-up questions like "explain step 2" — it remembers the context of your current question.',
  },
  {
    n: 4,
    title: 'See a full explanation',
    body: 'Math and Science explanations are shown as numbered steps. Reading and Language questions alternate between English and Filipino, matching how the real UPCAT is structured.',
  },
  {
    n: 5,
    title: 'Track your progress',
    body: 'Every answer updates your Dashboard: subject accuracy, your estimated UPG score over time, and a list of your weakest topics — which automatically feed into Spaced Review so you see them again at the right interval.',
  },
]

export default function AboutPage() {
  return (
    <>
      <Header/>
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl mb-3" style={{ color: 'var(--text)' }}>How UPCAT PREP Works</h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text)' }}>
            A quick tour of what this app does and how to get the most out of it before your exam.
          </p>
        </div>

        {/* ── What it is ── */}
        <section aria-labelledby="what-heading" className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 id="what-heading" className="font-serif text-2xl mb-3" style={{ color: 'var(--text)' }}>What is this?</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
            UPCAT PREP is a study tool for the University of the Philippines College Admission Test. Instead of a fixed
            question bank that runs out after a few sessions, an AI model writes new questions on demand — across all
            four UPCAT subjects and every official subtopic.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {SUBJECT_LIST.map(s => {
              const d = UPCAT_TOPICS[s]
              return <span key={s} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: d.bg, color: d.color }}>{d.icon} {d.label}</span>
            })}
          </div>
        </section>

        {/* ── Step by step ── */}
        <section aria-labelledby="steps-heading" className="mb-6">
          <h2 id="steps-heading" className="font-serif text-2xl mb-4" style={{ color: 'var(--text)' }}>Step by step</h2>
          <ol className="space-y-4">
            {STEPS.map(step => (
              <li key={step.n} className="rounded-2xl border p-5 flex gap-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-blue-700 text-white font-serif text-lg flex items-center justify-center shrink-0"
                >
                  {step.n}
                </span>
                <div>
                  <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text)' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── UPG explainer ── */}
        <section aria-labelledby="upg-heading" className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 id="upg-heading" className="font-serif text-2xl mb-3" style={{ color: 'var(--text)' }}>What is the UPG score?</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
            UP uses a weighted General Weighted Average called the UPG to rank applicants — lower is better, with 1.0
            being a perfect score. This app estimates your UPG using the same weighting:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {SUBJECT_LIST.map(s => {
              const d = UPCAT_TOPICS[s]
              return (
                <div key={s} className="rounded-xl p-3 text-center" style={{ background: d.bg }}>
                  <div className="text-xs font-semibold" style={{ color: d.color }}>{s}</div>
                  <div className="font-serif text-xl" style={{ color: d.color }}>{Math.round(d.weight * 100)}%</div>
                </div>
              )
            })}
          </div>
          <p className="text-xs" style={{ color: 'var(--text)' }}>
            This is an estimate for practice purposes only — your actual UPG depends on the official UPCAT scoring scale.
          </p>
        </section>

        {/* ── Tips ── */}
        <section aria-labelledby="tips-heading" className="rounded-2xl border-2 p-6 mb-8 bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800">
          <h2 id="tips-heading" className="font-serif text-2xl mb-3 text-green-900 dark:text-green-300">Getting the most out of it</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside text-green-900 dark:text-green-300">
            <li>Start in <strong>Setup</strong> to connect an AI provider — you need at least one of Gemini, Groq, or OpenAI configured before questions can generate.</li>
            <li>Use <strong>Practice</strong> mode daily on 1–2 subjects rather than all four at once — it&apos;s easier to build a streak.</li>
            <li>Check your <strong>Dashboard</strong> weekly; the weakest topics shown there are exactly what Spaced Review will bring back.</li>
            <li>Save a real <strong>Mock UPCAT</strong> attempt for when you want a realistic, timed full-length run — it can&apos;t be paused except for genuine emergencies.</li>
            <li>If a question feels off-topic or too easy/hard, use the AI Tutor chat to ask for a similar one instead of skipping blindly.</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/" className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            Start practicing →
          </Link>
          <Link href="/setup" className="px-6 py-3 rounded-xl border font-semibold text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            ⚙️ Go to Setup
          </Link>
        </div>
      </main>
    </>
  )
}
