import { NextResponse } from 'next/server'

import { type ChatMessage, generateText } from '@/lib/ai/providers'
import { BOOK_REFERENCE, ENGLISH_STYLE, clip, describeLearner } from '@/lib/ai/prompts'
import { aiErrorResponse, requireStudentForAi } from '@/lib/ai/server'
import { jsonError, readJson } from '@/lib/student/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 1500

export async function POST(request: Request) {
  const auth = await requireStudentForAi()
  if ('response' in auth) return auth.response
  const { student } = auth

  const body = await readJson<{ messages?: unknown; chapter?: unknown }>(request)
  const history: ChatMessage[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        Boolean(m) && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '',
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH) }))
  if (history.at(-1)?.role !== 'user') return jsonError('Ask a question first.', 400)

  const chapter = clip(body.chapter, 80)
  const system = [
    'You are the friendly radio tutor inside an interactive aviation English book. Help the student understand radio phraseology, procedures and the content of the book. You can explain, give examples, and quiz the student when asked (one question at a time, then wait for their answer).',
    'Keep replies short: usually under 120 words. If the student writes in another language, answer in simple English and add a one-line translation in their language. Politely steer off-topic questions back to aviation radio and the book.',
    ENGLISH_STYLE,
    describeLearner({ name: student.fullName || student.username, level: student.level, nativeLanguage: student.nativeLanguage, country: student.country }),
    chapter && `The student is currently reading: ${chapter}.`,
    BOOK_REFERENCE,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const { text, provider } = await generateText([{ role: 'system', content: system }, ...history], { maxTokens: 600 })
    return NextResponse.json({ reply: text, provider })
  } catch (error) {
    return aiErrorResponse(error)
  }
}
