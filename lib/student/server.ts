import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { StrapiError, strapiRequest } from '@/lib/admin/strapi'
import type { StudentProgress, StudentUser } from '@/lib/admin/types'

/**
 * Server-side helpers for the student session used by the book.
 * The student's Strapi JWT lives in an httpOnly cookie; the browser only talks
 * to our own /api/student/* route handlers, which forward to Strapi.
 */
export const STUDENT_COOKIE = 'student_jwt'

export interface StudentSessionUser {
  id: number
  username: string
  email: string
  fullName: string | null
}

export interface StudentSessionProgress {
  documentId: string
  chapterIndex: number
  completedChapters: number[]
  lastOpenedAt: string | null
}

export const toSessionUser = (user: StudentUser): StudentSessionUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.fullName ?? null,
})

export const toSessionProgress = (progress: StudentProgress | null): StudentSessionProgress | null =>
  progress
    ? {
        documentId: progress.documentId,
        chapterIndex: progress.chapterIndex ?? 0,
        completedChapters: progress.completedChapters ?? [],
        lastOpenedAt: progress.lastOpenedAt ?? null,
      }
    : null

export async function getStudentToken(): Promise<string | null> {
  return (await cookies()).get(STUDENT_COOKIE)?.value ?? null
}

export async function setStudentCookie(jwt: string) {
  const store = await cookies()
  store.set(STUDENT_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearStudentCookie() {
  const store = await cookies()
  store.delete({ name: STUDENT_COOKIE, path: '/' })
}

/** Latest progress entry of the logged-in student (the API is already scoped to them). */
export async function fetchLatestProgress(token: string): Promise<StudentProgress | null> {
  const res = await strapiRequest<{ data: StudentProgress[] }>(
    'student-progresses?sort=updatedAt:desc&pagination[pageSize]=1',
    { token },
  )
  return res.data[0] ?? null
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function errorResponse(error: unknown, fallback = 'Something went wrong.') {
  if (error instanceof StrapiError) {
    if (error.status === 401 || error.status === 403) return jsonError('Please sign in again.', 401)
    return jsonError(error.message, error.status >= 500 ? 502 : error.status)
  }
  if (error instanceof TypeError) return jsonError('The server is not reachable right now.', 503)
  return jsonError(fallback, 500)
}

export async function readJson<T extends Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as T) : ({} as T)
  } catch {
    return {} as T
  }
}

export const asInt = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback

export const asIntArray = (value: unknown) =>
  Array.isArray(value) ? [...new Set(value.map((v) => asInt(v, -1)).filter((v) => v >= 0))].sort((a, b) => a - b) : []
