import { strapiRequest } from '@/lib/admin/strapi'
import type { StudentUser } from '@/lib/admin/types'
import { AiUnavailableError } from '@/lib/ai/providers'
import { errorResponse, getStudentToken, jsonError } from '@/lib/student/server'

/** The AI routes are for signed-in students only (keeps the free API quota for real readers). */
export async function requireStudentForAi(): Promise<{ student: StudentUser } | { response: Response }> {
  const token = await getStudentToken()
  if (!token) return { response: jsonError('Please sign in to use the AI tutor.', 401) }
  try {
    const student = await strapiRequest<StudentUser>('users/me', { token })
    if (student.blocked) return { response: jsonError('Your account is blocked.', 403) }
    return { student }
  } catch (error) {
    return { response: errorResponse(error) }
  }
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AiUnavailableError) return jsonError(error.message, 503)
  return jsonError('The AI assistant could not answer. Please try again.', 500)
}
