/** Shapes returned by Strapi for the teacher dashboard. Safe to import from client components. */

export const TEACHER_ROLE = 'teacher'

export type StudentLevel = 'beginner' | 'intermediate' | 'advanced'
export const STUDENT_LEVELS: StudentLevel[] = ['beginner', 'intermediate', 'advanced']

export interface StudentProgress {
  id: number
  documentId: string
  chapterIndex: number | null
  completedChapters: number[] | null
  notes?: string | null
  lastOpenedAt?: string | null
  updatedAt: string
}

export interface TestResult {
  id: number
  documentId: string
  testKey: string
  testTitle?: string | null
  score: number
  total: number
  percent?: number | null
  passed: boolean
  durationSeconds?: number | null
  completedAt?: string | null
  createdAt: string
}

export interface ExerciseAttempt {
  id: number
  documentId: string
  kind: string
  exerciseKey: string
  correct: number
  total: number
  completedAt?: string | null
  createdAt: string
}

export interface StudentUser {
  id: number
  documentId: string
  username: string
  email: string
  fullName?: string | null
  country?: string | null
  nativeLanguage?: string | null
  level?: StudentLevel | null
  notes?: string | null
  blocked: boolean
  confirmed: boolean
  createdAt: string
  role?: { id: number; name: string; type: string } | null
  studentProgress?: StudentProgress[]
  testResults?: TestResult[]
  exerciseAttempts?: ExerciseAttempt[]
}

export function displayName(student: StudentUser): string {
  return student.fullName?.trim() || student.username
}

export function currentProgress(student: StudentUser): StudentProgress | null {
  const list = student.studentProgress ?? []
  if (list.length === 0) return null
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
}

export function lastActivity(student: StudentUser): string | null {
  const dates = [
    currentProgress(student)?.lastOpenedAt,
    ...(student.testResults ?? []).map((t) => t.completedAt ?? t.createdAt),
    ...(student.exerciseAttempts ?? []).map((e) => e.completedAt ?? e.createdAt),
  ].filter((d): d is string => Boolean(d))
  return dates.sort().at(-1) ?? null
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function capitalize(value: string | null | undefined): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—'
}
