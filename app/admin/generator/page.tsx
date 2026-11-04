import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import AiGenerator from '@/components/admin/ai-generator'
import { requireTeacher } from '@/lib/admin/strapi'
import { isAiConfigured } from '@/lib/ai/providers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function GeneratorPage() {
  await requireTeacher()

  return (
    <div>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-ink/55 hover:text-ink">
        <ArrowLeft className="size-4" /> All students
      </Link>
      <div className="mb-6">
        <h1 className="font-display text-3xl">AI material generator</h1>
        <p className="mt-1 text-sm text-ink/60">
          Create quiz questions, readback drills or lesson handouts based on the book, for any topic and level.
        </p>
      </div>
      {!isAiConfigured() && (
        <p className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No AI provider key is configured. Add GEMINI_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY to the server
          environment.
        </p>
      )}
      <AiGenerator />
    </div>
  )
}
