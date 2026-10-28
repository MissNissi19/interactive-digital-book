import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

import { logout } from '@/lib/admin/actions'
import { getAdminToken } from '@/lib/admin/strapi'

export const metadata: Metadata = {
  title: 'Student dashboard · Interactive Digital Book',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const signedIn = Boolean(await getAdminToken())

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-navy text-brass-light">
              <BookOpen className="size-4" />
            </div>
            <div>
              <div className="font-display text-lg leading-tight">The Last Signal</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45">Student dashboard</div>
            </div>
          </Link>
          {signedIn && (
            <form action={logout}>
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/55 transition hover:text-ink"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  )
}
