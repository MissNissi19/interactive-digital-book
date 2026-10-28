import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import StudentForm from '@/components/admin/student-form'
import { Badge } from '@/components/ui/badge'
import { fetchStudent, requireTeacher } from '@/lib/admin/strapi'
import { capitalize, currentProgress, displayName, formatDate } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-[#f8f1e4] p-5">
      <h2 className="font-display text-lg">{title}</h2>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  )
}

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { token } = await requireTeacher()
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const student = await fetchStudent(token, id)
  if (!student) notFound()

  const progress = currentProgress(student)
  const tests = [...(student.testResults ?? [])].sort((a, b) =>
    (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt),
  )
  const attempts = [...(student.exerciseAttempts ?? [])].sort((a, b) =>
    (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt),
  )

  return (
    <div>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-ink/55 hover:text-ink">
        <ArrowLeft className="size-4" /> All students
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">{displayName(student)}</h1>
        {student.blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="outline">Active</Badge>}
        {student.country && <Badge variant="secondary">{student.country}</Badge>}
        {student.level && <Badge variant="secondary">{capitalize(student.level)}</Badge>}
        <span className="text-sm text-ink/50">Joined {formatDate(student.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StudentForm student={student} progress={progress} />
        </div>

        <aside className="space-y-6">
          <Panel title="Test results">
            {tests.length === 0 ? (
              <p className="text-ink/55">No tests taken yet.</p>
            ) : (
              <ul className="divide-y divide-ink/10">
                {tests.map((test) => (
                  <li key={test.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="font-medium">{test.testTitle || test.testKey}</div>
                      <div className="text-xs text-ink/50">{formatDate(test.completedAt ?? test.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">
                        {test.score}/{test.total}
                      </div>
                      <div className={`text-xs ${test.passed ? 'text-emerald-700' : 'text-destructive'}`}>
                        {test.passed ? 'Passed' : 'Failed'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Exercises">
            {attempts.length === 0 ? (
              <p className="text-ink/55">No exercises yet.</p>
            ) : (
              <ul className="divide-y divide-ink/10">
                {attempts.slice(0, 15).map((attempt) => (
                  <li key={attempt.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="font-medium">{capitalize(attempt.kind)}</div>
                      <div className="text-xs text-ink/50">
                        {attempt.exerciseKey} · {formatDate(attempt.completedAt ?? attempt.createdAt)}
                      </div>
                    </div>
                    <div className="font-mono">
                      {attempt.correct}/{attempt.total}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Activity">
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-ink/55">Last opened</dt>
              <dd>{formatDate(progress?.lastOpenedAt)}</dd>
              <dt className="text-ink/55">Progress updated</dt>
              <dd>{formatDate(progress?.updatedAt)}</dd>
              <dt className="text-ink/55">Username</dt>
              <dd className="truncate">{student.username}</dd>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
