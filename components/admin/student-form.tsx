'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createStudent, updateStudent, type FormState } from '@/lib/admin/actions'
import { COUNTRIES, LANGUAGES } from '@/lib/admin/options'
import { STUDENT_LEVELS, capitalize, type StudentProgress, type StudentUser } from '@/lib/admin/types'
import { BOOK_CHAPTERS } from '@/lib/chapters'

interface Props {
  student?: StudentUser
  progress?: StudentProgress | null
}

const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55'
const selectClass =
  'h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-[#f8f1e4] p-5 sm:p-6">
      <h2 className="font-display text-lg">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export default function StudentForm({ student, progress }: Props) {
  const isNew = !student
  const [state, action, pending] = useActionState<FormState, FormData>(isNew ? createStudent : updateStudent, {})
  const completed = new Set(progress?.completedChapters ?? [])

  return (
    <form action={action} className="space-y-6">
      {student && <input type="hidden" name="id" value={student.id} />}
      {progress && <input type="hidden" name="progressId" value={progress.documentId} />}

      <Section title="Account">
        {isNew ? (
          <>
            <div>
              <label htmlFor="username" className={labelClass}>
                Username *
              </label>
              <Input id="username" name="username" required minLength={3} autoComplete="off" className="bg-white" />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email *
              </label>
              <Input id="email" name="email" type="email" required autoComplete="off" className="bg-white" />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>
                Password * (min. 6 characters)
              </label>
              <Input
                id="password"
                name="password"
                type="text"
                required
                minLength={6}
                autoComplete="new-password"
                className="bg-white"
              />
            </div>
          </>
        ) : (
          <div className="text-sm sm:col-span-2">
            <span className="font-medium">{student.username}</span>
            <span className="text-ink/55"> · {student.email}</span>
          </div>
        )}
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <Input id="fullName" name="fullName" defaultValue={student?.fullName ?? ''} className="bg-white" />
        </div>
        <label className="flex items-center gap-2 self-end pb-1 text-sm">
          <input type="checkbox" name="blocked" defaultChecked={student?.blocked ?? false} className="size-4" />
          Blocked (cannot sign in)
        </label>
      </Section>

      <Section title="Profile">
        <div>
          <label htmlFor="country" className={labelClass}>
            Country
          </label>
          <Input id="country" name="country" list="country-options" defaultValue={student?.country ?? ''} className="bg-white" />
          <datalist id="country-options">
            {COUNTRIES.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="nativeLanguage" className={labelClass}>
            Native language
          </label>
          <Input
            id="nativeLanguage"
            name="nativeLanguage"
            list="language-options"
            defaultValue={student?.nativeLanguage ?? ''}
            className="bg-white"
          />
          <datalist id="language-options">
            {LANGUAGES.map((language) => (
              <option key={language} value={language} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="level" className={labelClass}>
            Level
          </label>
          <select id="level" name="level" defaultValue={student?.level ?? ''} className={selectClass}>
            <option value="">Not set</option>
            {STUDENT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {capitalize(level)}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Progress">
        <div>
          <label htmlFor="chapterIndex" className={labelClass}>
            Current chapter
          </label>
          <select
            id="chapterIndex"
            name="chapterIndex"
            defaultValue={String(progress?.chapterIndex ?? 0)}
            className={selectClass}
          >
            {BOOK_CHAPTERS.map((chapter, index) => (
              <option key={chapter.id} value={index}>
                {index === 0 ? 'Not started (cover)' : chapter.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className={labelClass}>Completed chapters</legend>
          <div className="grid gap-1.5">
            {BOOK_CHAPTERS.slice(1).map((chapter, offset) => {
              const index = offset + 1
              return (
                <label key={chapter.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="completedChapters"
                    value={index}
                    defaultChecked={completed.has(index)}
                    className="size-4"
                  />
                  {chapter.label}
                </label>
              )
            })}
          </div>
        </fieldset>
      </Section>

      <Section title="Teacher notes">
        <div className="sm:col-span-2">
          <Textarea
            name="notes"
            rows={4}
            defaultValue={student?.notes ?? ''}
            placeholder="Anything useful about this student: goals, difficulties, next steps…"
            className="bg-white"
          />
        </div>
      </Section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending} className="bg-navy text-paper hover:bg-navy/90">
          {pending ? 'Saving…' : isNew ? 'Create student' : 'Save changes'}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && !pending && <p className="text-sm text-brass-dark">{state.success}</p>}
      </div>
    </form>
  )
}
