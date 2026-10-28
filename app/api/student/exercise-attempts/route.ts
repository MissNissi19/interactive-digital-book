import { NextResponse } from 'next/server'

import { strapiRequest } from '@/lib/admin/strapi'
import { asInt, errorResponse, getStudentToken, jsonError, readJson } from '@/lib/student/server'

const KINDS = ['listening', 'readback', 'spelling', 'other'] as const
type Kind = (typeof KINDS)[number]

export async function POST(request: Request) {
  const token = await getStudentToken()
  if (!token) return jsonError('Please sign in to save your results.', 401)

  const body = await readJson<{ kind?: string; exerciseKey?: string; correct?: number; total?: number; details?: unknown }>(
    request,
  )
  const kind: Kind = (KINDS as readonly string[]).includes(body.kind ?? '') ? (body.kind as Kind) : 'other'
  const exerciseKey = typeof body.exerciseKey === 'string' ? body.exerciseKey.trim() : ''
  const correct = asInt(body.correct)
  const total = asInt(body.total)
  if (!exerciseKey || total <= 0 || correct < 0 || correct > total) return jsonError('Invalid exercise attempt.', 400)

  try {
    const result = await strapiRequest<{ data: { documentId: string } }>('exercise-attempts', {
      method: 'POST',
      token,
      body: {
        data: { kind, exerciseKey, correct, total, details: body.details ?? null, completedAt: new Date().toISOString() },
      },
    })
    return NextResponse.json({ documentId: result.data.documentId }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
