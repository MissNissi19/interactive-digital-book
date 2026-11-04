'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { postAi } from '@/lib/ai/client'
import { useStudent } from '@/lib/student/client'

export interface ExplainMistakeInput {
  kind: 'test' | 'readback' | 'spelling' | 'listening'
  prompt: string
  answer: string
  expected: string
  options?: string[]
  missing?: string[]
}

/** "Explain my mistake" button: asks the AI tutor why an answer was wrong. Remount (key) to reset. */
export default function ExplainMistake({ input, className = '' }: { input: ExplainMistakeInput; className?: string }) {
  const { user } = useStudent()
  const [explanation, setExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const explain = async () => {
    setPending(true)
    setError(null)
    try {
      const { explanation: text } = await postAi<{ explanation: string }>('explain', input)
      setExplanation(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get an explanation.')
    } finally {
      setPending(false)
    }
  }

  if (!user) {
    return (
      <p className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40 ${className}`}>
        <Sparkles className="size-3.5" /> Sign in to get an AI explanation
      </p>
    )
  }

  if (explanation) {
    return (
      <div className={`rounded-lg border border-navy/15 bg-navy/5 px-4 py-3 ${className}`}>
        <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-navy/70">
          <Sparkles className="size-3.5" /> AI tutor
        </p>
        <p className="whitespace-pre-line font-serif text-sm leading-relaxed text-ink/80">{explanation}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void explain()}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-full border border-navy/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-navy/80 transition hover:border-navy/50 hover:text-navy disabled:opacity-60"
      >
        <Sparkles className={`size-3.5 ${pending ? 'animate-pulse' : ''}`} /> {pending ? 'Thinking…' : 'Explain my mistake'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
