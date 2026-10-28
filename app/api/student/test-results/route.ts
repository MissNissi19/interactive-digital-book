import { NextResponse } from 'next/server'

import { strapiRequest } from '@/lib/admin/strapi'
import { asInt, errorResponse, getStudentToken, jsonError, readJson } from '@/lib/student/server'

export async function POST(request: Request) {
  const token = await getStudentToken()
  if (!token) return jsonError('Please sign in to save your results.', 401)

  const body = await readJson<{
    testKey?: string
    testTitle?: string
    score?: number
    total?: number
    passed?: boolean
    durationSeconds?: number
    answers?: unknown
  }>(request)
  const testKey = typeof body.testKey === 'string' ? body.testKey.trim() : ''
  const score = asInt(body.score)
  const total = asInt(body.total)
  if (!testKey || total <= 0 || score < 0 || score > total) return jsonError('Invalid test result.', 400)

  try {
    const result = await strapiRequest<{ data: { documentId: string } }>('test-results', {
      method: 'POST',
      token,
      body: {
        data: {
          testKey,
          testTitle: typeof body.testTitle === 'string' ? body.testTitle : null,
          score,
          total,
          percent: Math.round((score / total) * 100),
          passed: Boolean(body.passed),
          durationSeconds: body.durationSeconds == null ? null : Math.max(asInt(body.durationSeconds), 0),
          answers: body.answers ?? null,
          completedAt: new Date().toISOString(),
        },
      },
    })
    return NextResponse.json({ documentId: result.data.documentId }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
