/**
 * Minimal Strapi v5 REST API client.
 * Fetches run server-side (React Server Components / Route Handlers).
 *
 * Env:
 *   STRAPI_URL        – base URL of the Strapi instance (default http://localhost:1337)
 *   STRAPI_API_TOKEN  – optional bearer token for private content
 */

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export interface StrapiPagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export interface StrapiListResponse<T> {
  data: T[]
  meta: { pagination: StrapiPagination }
}

export interface StrapiEntryResponse<T> {
  data: T
  meta: Record<string, unknown>
}

export interface StrapiQuery {
  /** e.g. '*' or { cover: true, author: { populate: 'avatar' } } */
  populate?: '*' | string | Record<string, unknown>
  /** e.g. { slug: { $eq: 'chapter-1' } } */
  filters?: Record<string, unknown>
  sort?: string | string[]
  'pagination[page]'?: number
  'pagination[pageSize]'?: number
  locale?: string
  status?: 'draft' | 'published'
  [key: string]: unknown
}

function serialize(value: unknown, prefix: string, params: URLSearchParams) {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, i) => serialize(item, `${prefix}[${i}]`, params))
    return
  }
  if (typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      serialize(val, prefix ? `${prefix}[${key}]` : key, params)
    }
    return
  }
  params.set(prefix, String(value))
}

export async function fetchStrapi<R>(
  path: string,
  query: StrapiQuery = {},
  init: { revalidate?: number | false } = {},
): Promise<R> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    serialize(value, key, params)
  }
  const qs = params.toString()
  const url = `${STRAPI_URL}/api/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
    },
    next: { revalidate: init.revalidate ?? 60 },
  })

  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText} (${url})`)
  }
  return res.json() as Promise<R>
}

/** Helper for media URLs (Strapi returns relative paths by default). */
export function strapiMedia(url?: string | null): string {
  if (!url) return ''
  return url.startsWith('http') ? url : `${STRAPI_URL}${url}`
}
