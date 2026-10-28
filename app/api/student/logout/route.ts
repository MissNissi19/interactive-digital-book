import { NextResponse } from 'next/server'

import { clearStudentCookie } from '@/lib/student/server'

export async function POST() {
  await clearStudentCookie()
  return NextResponse.json({ ok: true })
}
