'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ADMIN_COOKIE, StrapiError, fetchTeacher, requireTeacher, strapiRequest } from './strapi'
import { STUDENT_LEVELS, type StudentLevel, type StudentUser } from './types'

export interface FormState {
  error?: string
  success?: string
}

const text = (form: FormData, key: string) => {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}
const orNull = (value: string) => (value === '' ? null : value)

function errorMessage(error: unknown): string {
  if (error instanceof StrapiError) return error.message
  if (error instanceof TypeError) return 'Cannot reach Strapi. Is the CMS running?'
  return 'Something went wrong. Please try again.'
}

function profileFromForm(form: FormData) {
  const level = text(form, 'level')
  return {
    fullName: orNull(text(form, 'fullName')),
    country: orNull(text(form, 'country')),
    nativeLanguage: orNull(text(form, 'nativeLanguage')),
    level: (STUDENT_LEVELS as string[]).includes(level) ? (level as StudentLevel) : null,
    notes: orNull(text(form, 'notes')),
    blocked: form.get('blocked') === 'on',
  }
}

function progressFromForm(form: FormData) {
  const chapterIndex = Number.parseInt(text(form, 'chapterIndex'), 10)
  const completedChapters = form
    .getAll('completedChapters')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b)
  return { chapterIndex: Number.isNaN(chapterIndex) ? 0 : chapterIndex, completedChapters }
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const identifier = text(form, 'identifier')
  const password = form.get('password')
  if (!identifier || typeof password !== 'string' || !password) {
    return { error: 'Enter your email and password.' }
  }

  let jwt: string
  try {
    const auth = await strapiRequest<{ jwt: string }>('auth/local', {
      method: 'POST',
      body: { identifier, password },
    })
    jwt = auth.jwt
    if (!(await fetchTeacher(jwt))) {
      return { error: 'This account is not a teacher account, so it cannot open the dashboard.' }
    }
  } catch (error) {
    if (error instanceof StrapiError && error.status === 400) return { error: 'Invalid email or password.' }
    return { error: errorMessage(error) }
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 60 * 60 * 24 * 7,
  })
  redirect('/admin')
}

export async function logout() {
  const store = await cookies()
  store.delete({ name: ADMIN_COOKIE, path: '/admin' })
  redirect('/admin/login')
}

export async function updateStudent(_prev: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireTeacher()
  const id = Number(text(form, 'id'))
  const progressId = orNull(text(form, 'progressId'))
  if (!id) return { error: 'Missing student id.' }

  try {
    await strapiRequest(`users/${id}`, { method: 'PUT', body: profileFromForm(form), token })

    const progress = progressFromForm(form)
    if (progressId) {
      await strapiRequest(`student-progresses/${progressId}`, {
        method: 'PUT',
        body: { data: progress },
        token,
      })
    } else {
      await strapiRequest('student-progresses', {
        method: 'POST',
        body: { data: { ...progress, student: id } },
        token,
      })
    }
  } catch (error) {
    return { error: errorMessage(error) }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/students/${id}`)
  return { success: 'Saved.' }
}

export async function createStudent(_prev: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireTeacher()
  const username = text(form, 'username')
  const email = text(form, 'email')
  const password = form.get('password')
  if (!username || !email || typeof password !== 'string' || password.length < 6) {
    return { error: 'Username, email and a password of at least 6 characters are required.' }
  }

  let created: StudentUser
  try {
    created = await strapiRequest<StudentUser>('users', {
      method: 'POST',
      body: { username, email, password, confirmed: true, ...profileFromForm(form) },
      token,
    })
    await strapiRequest('student-progresses', {
      method: 'POST',
      body: { data: { ...progressFromForm(form), student: created.id } },
      token,
    })
  } catch (error) {
    return { error: errorMessage(error) }
  }

  revalidatePath('/admin')
  redirect(`/admin/students/${created.id}`)
}
