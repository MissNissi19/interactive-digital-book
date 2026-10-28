import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import StudentForm from '@/components/admin/student-form'
import { requireTeacher } from '@/lib/admin/strapi'

export const dynamic = 'force-dynamic'

export default async function NewStudentPage() {
  await requireTeacher()

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-ink/55 hover:text-ink">
        <ArrowLeft className="size-4" /> All students
      </Link>
      <h1 className="mb-6 font-display text-3xl">Add student</h1>
      <StudentForm />
    </div>
  )
}
