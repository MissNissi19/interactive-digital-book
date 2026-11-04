import { NextResponse } from 'next/server'

import { generateText } from '@/lib/ai/providers'
import { BOOK_REFERENCE, ENGLISH_STYLE, clip, describeLearner } from '@/lib/ai/prompts'
import { aiErrorResponse, requireStudentForAi } from '@/lib/ai/server'
import { jsonError, readJson } from '@/lib/student/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const KINDS = {
  test: 'a multiple-choice question in the radio test',
  readback: 'a readback exercise (the student types what they would transmit back to the tower)',
  spelling: 'a call-sign spelling exercise (NATO/ICAO phonetic alphabet)',
  listening: 'a listening exercise (the student heard a transmission and had to pick which one it was)',
} as const
type Kind = keyof typeof KINDS

export async function POST(request: Request) {
  const auth = await requireStudentForAi()
  if ('response' in auth) return auth.response
  const { student } = auth

  const body = await readJson<{
    kind?: string
    prompt?: unknown
    answer?: unknown
    expected?: unknown
    options?: unknown
    missing?: unknown
  }>(request)
  const kind = (body.kind && body.kind in KINDS ? body.kind : 'test') as Kind
  const prompt = clip(body.prompt, 600)
  const answer = clip(body.answer, 600) || '(no answer)'
  const expected = clip(body.expected, 600)
  if (!prompt || !expected) return jsonError('Nothing to explain.', 400)
  const options = Array.isArray(body.options) ? body.options.map((o) => clip(o, 200)).filter(Boolean).slice(0, 6) : []
  const missing = Array.isArray(body.missing) ? body.missing.map((o) => clip(o, 60)).filter(Boolean).slice(0, 12) : []

  const system = [
    'You are a patient aviation radio instructor. The student got an exercise wrong. Explain the mistake in 2–4 short sentences: what the correct answer means, why their answer is wrong or incomplete, and one tip to remember it. Be encouraging and never repeat the whole question back.',
    ENGLISH_STYLE,
    describeLearner({ level: student.level, nativeLanguage: student.nativeLanguage }),
    BOOK_REFERENCE,
  ]
    .filter(Boolean)
    .join('\n\n')

  const user = [
    `Exercise type: ${KINDS[kind]}.`,
    `Question / instruction: ${prompt}`,
    options.length ? `Options: ${options.map((o, i) => `${i + 1}) ${o}`).join('  ')}` : '',
    `Student's answer: ${answer}`,
    `Correct answer: ${expected}`,
    missing.length ? `Required items missing from the student's answer: ${missing.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const { text, provider } = await generateText(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: 350, temperature: 0.3 },
    )
    return NextResponse.json({ explanation: text, provider })
  } catch (error) {
    return aiErrorResponse(error)
  }
}
