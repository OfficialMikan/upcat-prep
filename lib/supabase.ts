import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export async function getQuestionFromDB(subject: string, topic: string, subtopic: string) {
  try {
    const { data, error } = await supabase
      .from('questions').select('*')
      .eq('subject', subject).eq('topic', topic).eq('subtopic', subtopic)
      .limit(10).order('created_at', { ascending: false })
    if (error || !data?.length) return null
    return data[Math.floor(Math.random() * data.length)]
  } catch { return null }
}

export async function saveQuestionToDB(question: Record<string, unknown>) {
  try {
    const { error } = await supabase.from('questions').insert([{
      subject: question.subject, subtopic: question.subtopic, topic: question.topic,
      difficulty: question.difficulty, question: question.question, choices: question.choices,
      correct: question.correct, explanation: question.explanation, hint: question.hint,
      has_visual: question.hasVisual || false, visual_type: question.visualType || null,
      visual_data: question.visualData || null, language: question.language || 'en',
    }])
    if (error) console.warn('[Supabase] Save question failed:', error.message)
  } catch (e) { console.warn('[Supabase] Save question error:', e) }
}

export async function getQuestionCount(): Promise<number> {
  try {
    const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true })
    return count || 0
  } catch { return 0 }
}

export async function saveSessionToDB(session: Record<string, unknown>) {
  try {
    const { error } = await supabase.from('sessions').insert([{
      mode: session.mode, subjects: session.subjects, difficulty: session.difficulty,
      correct: session.correct, total: session.total, pct: session.pct,
      avg_time: session.avgTime, total_time_sec: session.totalTimeSec,
      upg: session.upg, sub_stats: session.subStats,
    }])
    if (error) console.warn('[Supabase] Save session failed:', error.message)
  } catch (e) { console.warn('[Supabase] Save session error:', e) }
}

export async function getSessionsFromDB(limit = 50) {
  try {
    const { data, error } = await supabase.from('sessions').select('*')
      .order('created_at', { ascending: false }).limit(limit)
    if (error) return []
    return data || []
  } catch { return [] }
}

export async function upsertTopicStat(subject: string, subtopic: string, topic: string, correct: boolean) {
  const id = `${subject}::${topic}`
  try {
    const { data: existing } = await supabase.from('topic_stats').select('*').eq('id', id).single()
    if (existing) {
      const newCorrect = existing.correct + (correct ? 1 : 0)
      const newTotal = existing.total + 1
      await supabase.from('topic_stats').update({
        correct: newCorrect, total: newTotal, accuracy: (newCorrect / newTotal) * 100,
        last_seen: new Date().toISOString(),
      }).eq('id', id)
    } else {
      await supabase.from('topic_stats').insert([{
        id, subject, subtopic, topic, correct: correct ? 1 : 0, total: 1,
        accuracy: correct ? 100 : 0, last_seen: new Date().toISOString(),
      }])
    }
  } catch (e) { console.warn('[Supabase] Topic stat error:', e) }
}

export async function getTopicStatsFromDB() {
  try {
    const { data } = await supabase.from('topic_stats').select('*').order('accuracy', { ascending: true })
    return data || []
  } catch { return [] }
}

export async function upsertSRItem(subject: string, topic: string, subtopic: string, correct: boolean) {
  const id = `${subject}::${topic}`
  try {
    const { data: existing } = await supabase.from('sr_queue').select('*').eq('id', id).single()
    const item = existing || {
      id, subject, topic, subtopic, interval: 1, ease_factor: 2.5,
      repetitions: 0, next_review: new Date().toISOString(),
    }
    if (correct) {
      item.repetitions++
      if (item.repetitions === 1) item.interval = 1
      else if (item.repetitions === 2) item.interval = 6
      else item.interval = Math.round(item.interval * item.ease_factor)
      item.ease_factor = Math.max(1.3, item.ease_factor + 0.1)
    } else {
      item.repetitions = 0; item.interval = 1
      item.ease_factor = Math.max(1.3, item.ease_factor - 0.2)
    }
    item.next_review = new Date(Date.now() + item.interval * 86400000).toISOString()
    if (existing) await supabase.from('sr_queue').update(item).eq('id', id)
    else await supabase.from('sr_queue').insert([item])
  } catch (e) { console.warn('[Supabase] SR item error:', e) }
}

export async function getDueSRItems() {
  try {
    const { data } = await supabase.from('sr_queue').select('*')
      .lte('next_review', new Date().toISOString()).order('next_review', { ascending: true })
    return data || []
  } catch { return [] }
}

export async function getAllSRItems() {
  try {
    const { data } = await supabase.from('sr_queue').select('*').order('next_review', { ascending: true })
    return data || []
  } catch { return [] }
}
