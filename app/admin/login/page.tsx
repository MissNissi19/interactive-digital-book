'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login, type FormState } from '@/lib/admin/actions'

const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55'

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {})

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-[1.5rem] border border-ink/10 bg-[#f8f1e4] p-8 shadow-[0_20px_60px_rgba(23,37,52,.08)]">
      <h1 className="font-display text-2xl">Sign in</h1>
      <p className="mt-1 text-sm text-ink/60">Teacher access to the student dashboard.</p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="identifier" className={labelClass}>
            Email or username
          </label>
          <Input id="identifier" name="identifier" autoComplete="username" required className="bg-white" />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="bg-white"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full bg-navy text-paper hover:bg-navy/90">
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
