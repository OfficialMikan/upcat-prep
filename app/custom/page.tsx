'use client'
import { useState, useRef, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { SUBJECT_LIST } from '@/data/topics'
import type { Subject, Question } from '@/types'
import { saveQuestionToDB } from '@/lib/supabase'
import clsx from 'clsx'

type Tab = 'upload' | 'paste'

export default function CustomQuestionsPage() {
  const [tab, setTab] = useState<Tab>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processText, setProcessText] = useState('')
  const [result, setResult] = useState<{ ok: boolean; questions?: Question[]; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pasteContent, setPasteContent] = useState('')
  const [pasteSubject, setPasteSubject] = useState<Subject>('Math')
  const [pasteMode, setPasteMode] = useState<'extract' | 'generate'>('extract')
  const [pasteCount, setPasteCount] = useState(10)

  const extractPdfText = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    const maxPages = Math.min(pdf.numPages, 20)
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
      fullText += pageText + '\n'
    }
    return fullText.trim()
  }

  const guessSubject = (text: string): Subject => {
    const t = text.toLowerCase()
    const scores: Record<Subject, number> = { Math: 0, Science: 0, Reading: 0, Language: 0 }
    const check = (words: string[], sub: Subject) => words.forEach(w => { if (t.includes(w)) scores[sub] += 2 })
    check(['algebra', 'equation', 'geometry', 'trigonometry', 'probability', 'calculus', 'polynomial'], 'Math')
    check(['biology', 'chemistry', 'physics', 'cell', 'atom', 'energy', 'force', 'evolution', 'element'], 'Science')
    check(['passage', 'comprehension', 'inference', 'author', 'paragraph', 'theme', 'main idea'], 'Reading')
    check(['grammar', 'sentence', 'verb', 'noun', 'analogy', 'idiom', 'pronoun', 'vocabulary'], 'Language')
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as Subject
  }

  const processExtractedText = useCallback(async (text: string, subject: Subject, count: number, mode: 'extract' | 'generate') => {
    setProcessing(true); setResult(null)
    try {
      const res = await fetch('/api/extract-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, subject, count, mode }) })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || 'Failed to extract questions')
      }
      const data = await res.json() as { questions: Question[] }
      await Promise.all(data.questions.map(q => saveQuestionToDB(q as unknown as Record<string, unknown>)))
      setResult({ ok: true, questions: data.questions, message: `✅ ${data.questions.length} questions saved to your library!` })
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Processing failed' })
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setProcessing(true); setResult(null); setProcessText(`Reading ${file.name}...`)
    try {
      let text = ''
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setProcessText('Extracting text from PDF (pdf.js)...')
        text = await extractPdfText(file)
      } else {
        text = await file.text()
      }
      if (!text || text.trim().length < 20) {
        setResult({ ok: false, message: 'Could not read text from this file. Try a different file or paste content instead.' })
        setProcessing(false); return
      }
      setProcessText('Extracting questions with Gemini AI...')
      const subject = guessSubject(text)
      await processExtractedText(text, subject, 10, 'extract')
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Failed to process file' })
      setProcessing(false)
    }
  }, [processExtractedText])

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file) }
  const handlePasteSubmit = () => { if (pasteContent.trim()) processExtractedText(pasteContent, pasteSubject, pasteCount, pasteMode) }

  return (
    <>
      <Header/>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--text)' }}>📁 My Questions</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>Upload reviewers, paste content, or drop a PDF. AI extracts and saves UPCAT-style questions.</p>

        <div className="flex rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--border)' }}>
          {[{ id: 'upload' as Tab, label: '📂 Upload File' }, { id: 'paste' as Tab, label: '📝 Paste Content' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={clsx('flex-1 py-2.5 text-sm font-medium transition-colors', tab === t.id ? 'bg-blue-600 text-white' : '')} style={tab !== t.id ? { color: 'var(--text2)', background: 'var(--card)' } : {}}>{t.label}</button>
          ))}
        </div>

        {tab === 'upload' && (
          <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Upload a Reviewer File</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>PDF (powered by pdf.js for accurate extraction), TXT, or MD files.</p>
            <div onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              className={clsx('rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors', dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-blue-400')}
              style={{ borderColor: dragOver ? undefined : 'var(--border2)', background: dragOver ? undefined : 'var(--card2)' }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}/>
              <div className="text-4xl mb-3">📂</div>
              <div className="text-base font-medium" style={{ color: 'var(--text)' }}>Drop a file here or click to browse</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text3)' }}>PDF · TXT · MD · max ~10MB</div>
            </div>
            {processing && <div className="flex items-center gap-3 mt-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card2)' }}><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"/><span className="text-sm" style={{ color: 'var(--text2)' }}>{processText}</span></div>}
          </div>
        )}

        {tab === 'paste' && (
          <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Paste Questions or Notes</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>Paste reviewer text, existing Q&amp;A, or study notes.</p>
            <div className="flex gap-2 mb-3 flex-wrap">
              <select value={pasteSubject} onChange={e => setPasteSubject(e.target.value as Subject)} className="flex-1 min-w-[140px] rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                {SUBJECT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={pasteMode} onChange={e => setPasteMode(e.target.value as 'extract' | 'generate')} className="flex-1 min-w-[180px] rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                <option value="extract">Extract existing questions</option>
                <option value="generate">Generate from notes</option>
              </select>
              <select value={pasteCount} onChange={e => setPasteCount(Number(e.target.value))} className="w-36 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <textarea value={pasteContent} onChange={e => setPasteContent(e.target.value)} rows={8} placeholder="Paste reviewer content, notes, or existing questions here..." className="w-full rounded-lg border px-3 py-2.5 text-sm resize-y" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}/>
            <button onClick={handlePasteSubmit} disabled={processing || !pasteContent.trim()} className="mt-3 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">✨ Process with AI</button>
            {processing && <div className="flex items-center gap-3 mt-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card2)' }}><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"/><span className="text-sm" style={{ color: 'var(--text2)' }}>Processing with Gemini AI...</span></div>}
          </div>
        )}

        {result && !processing && (
          <div className={clsx('mt-5 rounded-xl p-4 text-sm', result.ok ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300')}>
            <p className="font-semibold mb-2">{result.message}</p>
            {result.questions && result.questions.slice(0, 3).map((q, i) => (
              <div key={i} className="mt-2 p-2.5 rounded-lg bg-white/50 dark:bg-black/20"><span className="text-xs font-semibold">{q.subject} · {q.topic}</span><p className="text-sm mt-1">{q.question}</p></div>
            ))}
            {result.questions && result.questions.length > 3 && <p className="text-xs mt-2 opacity-70">+{result.questions.length - 3} more saved</p>}
          </div>
        )}
      </div>
    </>
  )
}
