import { NextResponse } from 'next/server'

import { StrapiError, strapiRequest } from '@/lib/admin/strapi'
import type { StudentUser } from '@/lib/admin/types'
import {
  clearStudentCookie,
  errorResponse,
  fetchLatestProgress,
  getStudentToken,
  toSessionProgress,
  toSessionUser,
} from '@/lib/student/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = await getStudentToken()
  if (!token) return NextResponse.json({ user: null, progress: null })

  try {
    const [user, progress] = await Promise.all([
      strapiRequest<StudentUser>('users/me', { token }),
      fetchLatestProgress(token).catch(() => null),
    ])
    return NextResponse.json({ user: toSessionUser(user), progress: toSessionProgress(progress) })
  } catch (error) {
    if (error instanceof StrapiError && (error.status === 401 || error.status === 403)) {
      await clearStudentCookie()
      return NextResponse.json({ user: null, progress: null })
    }
    return errorResponse(error)
  }
}
