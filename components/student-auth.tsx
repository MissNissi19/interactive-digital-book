'use client'

import { useState } from 'react'
import { LogIn, LogOut, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStudent } from '@/lib/student/client'

const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55'

type Mode = 'login' | 'register'

export default function StudentAuth() {
  const { user, loading, login, register, logout } = useStudent()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55 sm:block">
          {user.fullName || user.username}
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55 transition hover:text-ink"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </div>
    )
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim()
    setPending(true)
    setError(null)
    const message =
      mode === 'login'
        ? await login(value('identifier'), String(form.get('password') ?? ''))
        : await register({
            username: value('username'),
            email: value('email'),
            password: String(form.get('password') ?? ''),
            fullName: value('fullName') || undefined,
          })
    setPending(false)
    if (message) setError(message)
    else setOpen(false)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/70 transition hover:border-ink/40 hover:text-ink"
      >
        <LogIn className="size-3.5" /> Sign in
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-auth-title"
            className="w-full max-w-sm rounded-[1.5rem] border border-ink/10 bg-[#f8f1e4] p-6 text-ink shadow-[0_20px_60px_rgba(23,37,52,.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 id="student-auth-title" className="font-display text-2xl">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  {mode === 'login'
                    ? 'Sign in to keep your progress and test results.'
                    : 'Your progress, tests and exercises will be saved to your account.'}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-ink/50 hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 flex gap-1 rounded-full bg-ink/5 p-1 font-mono text-[10px] uppercase tracking-[0.15em]">
              {(['login', 'register'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchMode(item)}
                  className={`flex-1 rounded-full px-3 py-1.5 transition ${mode === item ? 'bg-navy text-paper' : 'text-ink/60 hover:text-ink'}`}
                >
                  {item === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <form key={mode} onSubmit={submit} className="mt-5 space-y-4">
              {mode === 'login' ? (
                <div>
                  <label htmlFor="student-identifier" className={labelClass}>
                    Email or username
                  </label>
                  <Input id="student-identifier" name="identifier" autoComplete="username" required className="bg-white" />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="student-fullName" className={labelClass}>
                      Full name
                    </label>
                    <Input id="student-fullName" name="fullName" autoComplete="name" className="bg-white" />
                  </div>
                  <div>
                    <label htmlFor="student-username" className={labelClass}>
                      Username
                    </label>
                    <Input id="student-username" name="username" autoComplete="username" required minLength={3} className="bg-white" />
                  </div>
                  <div>
                    <label htmlFor="student-email" className={labelClass}>
                      Email
                    </label>
                    <Input id="student-email" name="email" type="email" autoComplete="email" required className="bg-white" />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="student-password" className={labelClass}>
                  Password
                </label>
                <Input
                  id="student-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  className="bg-white"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={pending} className="w-full bg-navy text-paper hover:bg-navy/90">
                {pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
