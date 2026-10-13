import { NextResponse, type NextRequest } from 'next/server'
import { localAirport, localRoute } from '@/lib/airport-fallback'

const API_BASE = 'https://api.flightplandatabase.com'
const allowedPaths = [/^nav\/airport\/[A-Za-z0-9]{3,4}$/, /^search\/plans$/, /^plan\/\d+$/]
const forwardedHeaders = ['x-limit-cap', 'x-limit-used', 'x-page-current', 'x-page-count', 'x-item-count']

function localResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'x-data-source': 'local' } })
}

async function fallback(target: string, search: URLSearchParams) {
  const airportMatch = target.match(/^nav\/airport\/([A-Za-z0-9]{3,4})$/)
  if (airportMatch) {
    const airport = await localAirport(airportMatch[1])
    return airport ? localResponse(airport) : localResponse({ message: 'Nothing found for that request.' }, 404)
  }
  if (target === 'search/plans') {
    const from = search.get('fromICAO')
    const to = search.get('toICAO')
    if (!from || !to) return localResponse({ message: 'Flight Plan Database is unavailable. Enter both a departure and a destination to generate a route from the built-in airport database.' }, 503)
    const route = await localRoute(from, to)
    return route ? localResponse([route]) : localResponse({ message: 'Nothing found for that request.' }, 404)
  }
  return localResponse({ message: 'Flight Plan Database is unavailable, so saved plans cannot be opened right now. Search again to generate a route.' }, 503)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const target = path.join('/')

  if (!allowedPaths.some((pattern) => pattern.test(target))) {
    return NextResponse.json({ message: 'Endpoint not allowed' }, { status: 404 })
  }

  const headers: Record<string, string> = { Accept: 'application/json', 'X-Units': 'AVIATION' }
  const apiKey = process.env.FPDB_API_KEY
  if (apiKey) headers.Authorization = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`

  if (process.env.FPDB_FORCE_FALLBACK === '1' || request.headers.get('x-fpdb-fallback') === '1') return fallback(target, request.nextUrl.searchParams)

  try {
    const upstream = await fetch(`${API_BASE}/${target}${request.nextUrl.search}`, {
      headers,
      signal: AbortSignal.timeout(6000),
      next: { revalidate: target.startsWith('nav/airport') ? 600 : 3600 },
    })
    if (!upstream.ok) return fallback(target, request.nextUrl.searchParams)
    const body = await upstream.text()
    const response = new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    })
    for (const name of forwardedHeaders) {
      const value = upstream.headers.get(name)
      if (value) response.headers.set(name, value)
    }
    return response
  } catch {
    return fallback(target, request.nextUrl.searchParams)
  }
}
