import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { TEACHER_ROLE, type StudentUser } from './types'

/**
 * Server-side helpers for the teacher dashboard (/admin).
 * The teacher logs in against Strapi (Users & Permissions, role "teacher");
 * the JWT is kept in an httpOnly cookie and every request is made from the server.
 */
export const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337'
export const ADMIN_COOKIE = 'admin_jwt'

export class StrapiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_COOKIE)?.value ?? null
}

export async function strapiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const hasBody = init.body !== undefined
  const res = await fetch(`${STRAPI_URL}/api/${path.replace(/^\/+/, '')}`, {
    method: init.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: hasBody ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const json = await res.json()
      message = json?.error?.message ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new StrapiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function fetchTeacher(token: string): Promise<StudentUser | null> {
  const me = await strapiRequest<StudentUser>('users/me?populate[role]=true', { token })
  return me.role?.type === TEACHER_ROLE ? me : null
}

/** Redirects to the login page unless the cookie holds a valid teacher JWT. */
export async function requireTeacher(): Promise<{ teacher: StudentUser; token: string }> {
  const token = await getAdminToken()
  if (token) {
    let teacher: StudentUser | null = null
    try {
      teacher = await fetchTeacher(token)
    } catch {
      teacher = null
    }
    if (teacher) return { teacher, token }
  }
  redirect('/admin/login')
}

const STUDENT_POPULATE =
  'populate[role]=true&populate[studentProgress]=true&populate[testResults]=true&populate[exerciseAttempts]=true'

export async function fetchStudents(token: string): Promise<StudentUser[]> {
  const users = await strapiRequest<StudentUser[]>(`users?${STUDENT_POPULATE}&sort=username:asc`, { token })
  return users.filter((user) => user.role?.type !== TEACHER_ROLE)
}

export async function fetchStudent(token: string, id: string | number): Promise<StudentUser | null> {
  try {
    return await strapiRequest<StudentUser>(`users/${id}?${STUDENT_POPULATE}`, { token })
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null
    throw error
  }
}
