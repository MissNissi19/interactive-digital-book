'use client'

import { useActionState, useState } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type GeneratorState, generateMaterial } from '@/lib/admin/ai-actions'
import { STUDENT_LEVELS, capitalize } from '@/lib/admin/types'

const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55'
const selectClass =
  'h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function resultText(state: GeneratorState): string {
  if (state.lesson) return state.lesson
  if (state.quiz) return JSON.stringify(state.quiz, null, 2)
  if (state.readback) return JSON.stringify(state.readback, null, 2)
  return ''
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

export default function AiGenerator() {
  const [state, action, pending] = useActionState(generateMaterial, {})
  const text = resultText(state)

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <form action={action} className="space-y-4 rounded-2xl border border-ink/10 bg-[#f8f1e4] p-5">
        <div>
          <label htmlFor="ai-kind" className={labelClass}>
            Create
          </label>
          <select id="ai-kind" name="kind" defaultValue={state.kind ?? 'quiz'} className={selectClass}>
            <option value="quiz">Quiz questions (multiple choice)</option>
            <option value="readback">Readback drills</option>
            <option value="lesson">Lesson handout</option>
          </select>
        </div>
        <div>
          <label htmlFor="ai-topic" className={labelClass}>
            Topic
          </label>
          <Input
            id="ai-topic"
            name="topic"
            required
            maxLength={300}
            defaultValue={state.topic}
            placeholder="e.g. joining the circuit at Rand"
            className="bg-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ai-level" className={labelClass}>
              Level
            </label>
            <select id="ai-level" name="level" defaultValue="intermediate" className={selectClass}>
              {STUDENT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {capitalize(level)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ai-count" className={labelClass}>
              How many
            </label>
            <Input id="ai-count" name="count" type="number" min={1} max={10} defaultValue={5} className="bg-white" />
          </div>
        </div>
        <Button type="submit" disabled={pending} className="w-full bg-navy text-paper hover:bg-navy/90">
          <Sparkles /> {pending ? 'Generating…' : 'Generate'}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <p className="text-xs text-ink/50">AI-generated material can contain mistakes. Check it before giving it to students.</p>
      </form>

      <section className="min-h-64 rounded-2xl border border-ink/10 bg-white/60 p-5">
        {!text ? (
          <p className="text-sm text-ink/55">Your generated material will appear here.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl">{state.topic}</h2>
              <CopyButton text={text} />
            </div>

            {state.lesson && <p className="whitespace-pre-line font-serif text-sm leading-relaxed">{state.lesson}</p>}

            {state.quiz && (
              <ol className="space-y-4">
                {state.quiz.map((item, index) => (
                  <li key={index} className="rounded-lg border border-ink/10 bg-white/70 p-4 text-sm">
                    <p className="font-medium">
                      {index + 1}. {item.question}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {item.options.map((option, optionIndex) => (
                        <li key={optionIndex} className={optionIndex === item.answer ? 'font-medium text-emerald-700' : 'text-ink/70'}>
                          {String.fromCharCode(65 + optionIndex)}) {option} {optionIndex === item.answer && '✓'}
                        </li>
                      ))}
                    </ul>
                    {item.explanation && <p className="mt-2 text-xs text-ink/55">{item.explanation}</p>}
                  </li>
                ))}
              </ol>
            )}

            {state.readback && (
              <ol className="space-y-4">
                {state.readback.map((item, index) => (
                  <li key={index} className="rounded-lg border border-ink/10 bg-white/70 p-4 text-sm">
                    <p className="font-medium">
                      {index + 1}. {item.prompt}
                    </p>
                    <p className="mt-2 text-ink/70">
                      Readback: <em>{item.model}</em>
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink/50">Must include: {item.required.join(' · ')}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
