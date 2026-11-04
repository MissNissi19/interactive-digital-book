'use client'

export async function postAi<T>(path: 'tutor' | 'explain', body: unknown): Promise<T> {
  const res = await fetch(`/api/ai/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json
}
