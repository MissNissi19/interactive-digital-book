'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import type { StudentSessionProgress, StudentSessionUser } from './server'

export type { StudentSessionProgress, StudentSessionUser }

export interface TestResultInput {
  testKey: string
  testTitle?: string
  score: number
  total: number
  passed: boolean
  durationSeconds?: number
  answers?: unknown
}

export interface ExerciseAttemptInput {
  kind: 'listening' | 'readback' | 'spelling' | 'other'
  exerciseKey: string
  correct: number
  total: number
  details?: unknown
}

interface StudentContextValue {
  user: StudentSessionUser | null
  progress: StudentSessionProgress | null
  /** True until the initial session check has finished. */
  loading: boolean
  login: (identifier: string, password: string) => Promise<string | null>
  register: (input: { username: string; email: string; password: string; fullName?: string }) => Promise<string | null>
  logout: () => Promise<void>
  saveProgress: (input: { chapterIndex: number; completedChapters?: number[] }) => void
  saveTestResult: (input: TestResultInput) => void
  saveExerciseAttempt: (input: ExerciseAttemptInput) => void
}

const noop = () => undefined
const StudentContext = createContext<StudentContextValue>({
  user: null,
  progress: null,
  loading: false,
  login: async () => 'Student sessions are not available here.',
  register: async () => 'Student sessions are not available here.',
  logout: async () => undefined,
  saveProgress: noop,
  saveTestResult: noop,
  saveExerciseAttempt: noop,
})

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/student/${path}`, {
    method: init.method ?? 'GET',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json
}

type Session = { user: StudentSessionUser | null; progress: StudentSessionProgress | null }

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentSessionUser | null>(null)
  const [progress, setProgress] = useState<StudentSessionProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef<StudentSessionUser | null>(null)
  userRef.current = user

  useEffect(() => {
    let cancelled = false
    api<Session>('me')
      .then((session) => {
        if (cancelled) return
        setUser(session.user)
        setProgress(session.progress)
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const session = await api<Session>('login', { method: 'POST', body: { identifier, password } })
      setUser(session.user)
      setProgress(session.progress)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not sign in.'
    }
  }, [])

  const register = useCallback(async (input: { username: string; email: string; password: string; fullName?: string }) => {
    try {
      const session = await api<Session>('register', { method: 'POST', body: input })
      setUser(session.user)
      setProgress(session.progress)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not create the account.'
    }
  }, [])

  const logout = useCallback(async () => {
    await api('logout', { method: 'POST' }).catch(() => undefined)
    setUser(null)
    setProgress(null)
  }, [])

  const saveProgress = useCallback((input: { chapterIndex: number; completedChapters?: number[] }) => {
    if (!userRef.current) return
    setProgress((current) => ({
      documentId: current?.documentId ?? '',
      chapterIndex: input.chapterIndex,
      completedChapters: [...new Set([...(current?.completedChapters ?? []), ...(input.completedChapters ?? [])])].sort(
        (a, b) => a - b,
      ),
      lastOpenedAt: new Date().toISOString(),
    }))
    api<{ progress: StudentSessionProgress }>('progress', { method: 'PUT', body: input })
      .then(({ progress: saved }) => setProgress(saved))
      .catch(() => undefined)
  }, [])

  const saveTestResult = useCallback((input: TestResultInput) => {
    if (!userRef.current) return
    api('test-results', { method: 'POST', body: input }).catch(() => undefined)
  }, [])

  const saveExerciseAttempt = useCallback((input: ExerciseAttemptInput) => {
    if (!userRef.current) return
    api('exercise-attempts', { method: 'POST', body: input }).catch(() => undefined)
  }, [])

  const value = useMemo<StudentContextValue>(
    () => ({ user, progress, loading, login, register, logout, saveProgress, saveTestResult, saveExerciseAttempt }),
    [user, progress, loading, login, register, logout, saveProgress, saveTestResult, saveExerciseAttempt],
  )

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export const useStudent = () => useContext(StudentContext)

/** Saves one exercise attempt the moment `finished` flips to true (and re-arms when it resets). */
export function useSaveExerciseAttempt(
  kind: ExerciseAttemptInput['kind'],
  exerciseKey: string,
  finished: boolean,
  correct: number,
  total: number,
) {
  const { saveExerciseAttempt } = useStudent()
  const saved = useRef(false)

  useEffect(() => {
    if (!finished) {
      saved.current = false
      return
    }
    if (saved.current || total <= 0) return
    saved.current = true
    saveExerciseAttempt({ kind, exerciseKey, correct, total })
  }, [finished, correct, total, kind, exerciseKey, saveExerciseAttempt])
}
