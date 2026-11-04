'use server'

import { AiUnavailableError, generateText, parseJsonObject } from '@/lib/ai/providers'
import { BOOK_REFERENCE, ENGLISH_STYLE } from '@/lib/ai/prompts'
import { requireTeacher } from './strapi'
import { STUDENT_LEVELS } from './types'

export type GeneratorKind = 'quiz' | 'readback' | 'lesson'

export interface QuizItem {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export interface ReadbackItem {
  prompt: string
  model: string
  required: string[]
}

export interface GeneratorState {
  error?: string
  kind?: GeneratorKind
  topic?: string
  quiz?: QuizItem[]
  readback?: ReadbackItem[]
  lesson?: string
}

const str = (value: unknown, max = 400) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

function toQuiz(data: Record<string, unknown> | null): QuizItem[] {
  const list = Array.isArray(data?.questions) ? data.questions : []
  return list.flatMap((raw): QuizItem[] => {
    const item = (raw ?? {}) as Record<string, unknown>
    const options = Array.isArray(item.options) ? item.options.map((o) => str(o, 200)).filter(Boolean).slice(0, 4) : []
    const answer = Number(item.answer)
    if (!str(item.question) || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return []
    return [{ question: str(item.question), options, answer, explanation: str(item.explanation) }]
  })
}

function toReadback(data: Record<string, unknown> | null): ReadbackItem[] {
  const list = Array.isArray(data?.drills) ? data.drills : []
  return list.flatMap((raw): ReadbackItem[] => {
    const item = (raw ?? {}) as Record<string, unknown>
    const required = Array.isArray(item.required) ? item.required.map((r) => str(r, 60)).filter(Boolean).slice(0, 12) : []
    if (!str(item.prompt) || !str(item.model) || required.length === 0) return []
    return [{ prompt: str(item.prompt), model: str(item.model), required }]
  })
}

const INSTRUCTIONS: Record<GeneratorKind, (count: number) => string> = {
  quiz: (count) =>
    `Write ${count} multiple-choice questions. Reply with JSON only: {"questions":[{"question":"…","options":["…","…","…","…"],"answer":<index 0-3 of the correct option>,"explanation":"one short sentence"}]}. Exactly one option is correct; distractors must be plausible.`,
  readback: (count) =>
    `Write ${count} readback drills: an ATC or information-service instruction and the correct pilot readback (call sign at the end). Reply with JSON only: {"drills":[{"prompt":"Tower: “…”","model":"…","required":["key items the readback must contain, e.g. runway, QNH, altitude, call sign"]}]}. Use South African ZS- call signs as in the book.`,
  lesson: () =>
    'Write a short lesson handout the teacher can give to students: a title line, a 2–3 sentence explanation, 4–6 key phrases with their meaning, one example radio exchange, and 3 practice tasks. Plain text, "- " bullets allowed.',
}

export async function generateMaterial(_prev: GeneratorState, form: FormData): Promise<GeneratorState> {
  await requireTeacher()

  const kindValue = str(form.get('kind'))
  const kind: GeneratorKind = kindValue === 'readback' || kindValue === 'lesson' ? kindValue : 'quiz'
  const topic = str(form.get('topic'), 300)
  const levelValue = str(form.get('level'))
  const level = (STUDENT_LEVELS as string[]).includes(levelValue) ? levelValue : 'intermediate'
  const count = Math.min(Math.max(Number.parseInt(str(form.get('count')), 10) || 5, 1), 10)
  if (!topic) return { error: 'Enter a topic, e.g. “joining the circuit at Rand”.', kind }

  const system = [
    'You help an aviation English teacher create training material for the interactive book below. Material must be accurate, consistent with the book and suitable for the given level.',
    ENGLISH_STYLE,
    BOOK_REFERENCE,
  ].join('\n\n')
  const user = `Topic: ${topic}\nStudent level: ${level}\n${INSTRUCTIONS[kind](count)}`

  try {
    const { text } = await generateText(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: kind === 'lesson' ? 900 : 1800, temperature: 0.7, json: kind !== 'lesson' },
    )
    if (kind === 'lesson') return { kind, topic, lesson: text }

    const data = parseJsonObject(text)
    const items = kind === 'quiz' ? toQuiz(data) : toReadback(data)
    if (items.length === 0) return { error: 'The AI returned an unexpected format. Please try again.', kind, topic }
    return kind === 'quiz' ? { kind, topic, quiz: items as QuizItem[] } : { kind, topic, readback: items as ReadbackItem[] }
  } catch (error) {
    if (error instanceof AiUnavailableError) return { error: error.message, kind, topic }
    return { error: 'Something went wrong. Please try again.', kind, topic }
  }
}
