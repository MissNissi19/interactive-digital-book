import { NextResponse } from 'next/server'

import { strapiRequest } from '@/lib/admin/strapi'
import type { StudentUser } from '@/lib/admin/types'
import { errorResponse, jsonError, readJson, setStudentCookie, toSessionUser } from '@/lib/student/server'

export async function POST(request: Request) {
  const body = await readJson<{ username?: string; email?: string; password?: string; fullName?: string }>(request)
  const username = body.username?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  if (username.length < 3) return jsonError('Username must be at least 3 characters.', 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('Enter a valid email address.', 400)
  if (password.length < 6) return jsonError('Password must be at least 6 characters.', 400)

  try {
    const auth = await strapiRequest<{ jwt: string; user: StudentUser }>('auth/local/register', {
      method: 'POST',
      body: { username, email, password },
    })
    const fullName = body.fullName?.trim()
    if (fullName) {
      // Students may only touch their own entries; the profile name is set through the
      // public register payload being ignored, so store it via a progress-less update.
      await strapiRequest(`users/${auth.user.id}`, { method: 'PUT', body: { fullName }, token: auth.jwt }).catch(
        () => undefined,
      )
    }
    await setStudentCookie(auth.jwt)
    return NextResponse.json({ user: toSessionUser({ ...auth.user, fullName: fullName || null }), progress: null })
  } catch (error) {
    return errorResponse(error)
  }
}
