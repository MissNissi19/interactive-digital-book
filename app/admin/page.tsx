import Link from 'next/link'
import { Plus, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchStudents, requireTeacher } from '@/lib/admin/strapi'
import { capitalize, currentProgress, displayName, formatDate, lastActivity, type StudentUser } from '@/lib/admin/types'
import { LAST_CHAPTER_INDEX, chapterLabel } from '@/lib/chapters'

export const dynamic = 'force-dynamic'

const selectClass =
  'h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function matches(student: StudentUser, needle: string, country: string) {
  if (country && student.country !== country) return false
  if (!needle) return true
  return [student.username, student.email, student.fullName, student.country, student.nativeLanguage].some((value) =>
    value?.toLowerCase().includes(needle),
  )
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string }>
}) {
  const { token } = await requireTeacher()
  const { q = '', country = '' } = await searchParams
  const students = await fetchStudents(token)

  const countries = [...new Set(students.map((s) => s.country).filter((c): c is string => Boolean(c)))].sort()
  const visible = students.filter((student) => matches(student, q.trim().toLowerCase(), country))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Students</h1>
          <p className="mt-1 text-sm text-ink/60">
            {students.length} {students.length === 1 ? 'student' : 'students'} · {countries.length}{' '}
            {countries.length === 1 ? 'country' : 'countries'}
          </p>
        </div>
        <Button
          render={<Link href="/admin/students/new" />}
          nativeButton={false}
          className="bg-navy text-paper hover:bg-navy/90"
        >
          <Plus /> Add student
        </Button>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-ink/40" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, country…"
            className="w-64 bg-white pl-8"
          />
        </div>
        <select name="country" defaultValue={country} className={selectClass}>
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {(q || country) && (
          <Link href="/admin" className="text-sm text-ink/55 hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-[#f8f1e4]">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/50">
            <tr className="border-b border-ink/10">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Tests</th>
              <th className="px-4 py-3 font-medium">Last activity</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink/55">
                  {students.length === 0 ? 'No students yet. Add the first one.' : 'No students match this filter.'}
                </td>
              </tr>
            )}
            {visible.map((student) => {
              const progress = currentProgress(student)
              const chapterIndex = progress?.chapterIndex ?? 0
              const percent = Math.round((Math.min(chapterIndex, LAST_CHAPTER_INDEX) / LAST_CHAPTER_INDEX) * 100)
              const tests = student.testResults ?? []
              const passed = tests.filter((t) => t.passed).length
              return (
                <tr key={student.id} className="border-b border-ink/5 last:border-0 hover:bg-white/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/students/${student.id}`} className="font-medium hover:underline">
                      {displayName(student)}
                    </Link>
                    <div className="text-xs text-ink/50">{student.email}</div>
                  </td>
                  <td className="px-4 py-3">{student.country || '—'}</td>
                  <td className="px-4 py-3">{student.nativeLanguage || '—'}</td>
                  <td className="px-4 py-3">{capitalize(student.level)}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{chapterLabel(chapterIndex)}</div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-brass" style={{ width: `${percent}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {tests.length === 0 ? '—' : `${passed} / ${tests.length} passed`}
                  </td>
                  <td className="px-4 py-3">{formatDate(lastActivity(student))}</td>
                  <td className="px-4 py-3">
                    {student.blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
