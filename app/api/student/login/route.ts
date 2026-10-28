import { NextResponse } from 'next/server'

import { StrapiError, strapiRequest } from '@/lib/admin/strapi'
import type { StudentUser } from '@/lib/admin/types'
import {
  errorResponse,
  fetchLatestProgress,
  jsonError,
  readJson,
  setStudentCookie,
  toSessionProgress,
  toSessionUser,
} from '@/lib/student/server'

export async function POST(request: Request) {
  const { identifier, password } = await readJson<{ identifier?: string; password?: string }>(request)
  if (!identifier?.trim() || !password) return jsonError('Enter your email and password.', 400)

  try {
    const auth = await strapiRequest<{ jwt: string; user: StudentUser }>('auth/local', {
      method: 'POST',
      body: { identifier: identifier.trim(), password },
    })
    const progress = await fetchLatestProgress(auth.jwt).catch(() => null)
    await setStudentCookie(auth.jwt)
    return NextResponse.json({ user: toSessionUser(auth.user), progress: toSessionProgress(progress) })
  } catch (error) {
    if (error instanceof StrapiError && error.status === 400) return jsonError('Invalid email or password.', 400)
    return errorResponse(error)
  }
}
