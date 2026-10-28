import { NextResponse } from 'next/server'

import { strapiRequest } from '@/lib/admin/strapi'
import type { StudentProgress } from '@/lib/admin/types'
import {
  asInt,
  asIntArray,
  errorResponse,
  fetchLatestProgress,
  getStudentToken,
  jsonError,
  readJson,
  toSessionProgress,
} from '@/lib/student/server'
import { LAST_CHAPTER_INDEX } from '@/lib/chapters'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  const token = await getStudentToken()
  if (!token) return jsonError('Please sign in to save your progress.', 401)

  const body = await readJson<{ chapterIndex?: number; completedChapters?: number[] }>(request)
  const chapterIndex = Math.min(Math.max(asInt(body.chapterIndex), 0), LAST_CHAPTER_INDEX)
  const incoming = asIntArray(body.completedChapters).filter((index) => index <= LAST_CHAPTER_INDEX)

  try {
    const existing = await fetchLatestProgress(token)
    const completedChapters = [...new Set([...(existing?.completedChapters ?? []), ...incoming])].sort((a, b) => a - b)
    const data = { chapterIndex, completedChapters, lastOpenedAt: new Date().toISOString() }

    const saved = existing
      ? await strapiRequest<{ data: StudentProgress }>(`student-progresses/${existing.documentId}`, {
          method: 'PUT',
          body: { data },
          token,
        })
      : await strapiRequest<{ data: StudentProgress }>('student-progresses', { method: 'POST', body: { data }, token })

    return NextResponse.json({ progress: toSessionProgress(saved.data) })
  } catch (error) {
    return errorResponse(error)
  }
}
