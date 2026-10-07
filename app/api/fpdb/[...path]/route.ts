import { NextResponse, type NextRequest } from 'next/server'

const API_BASE = 'https://api.flightplandatabase.com'
const allowedPaths = [/^nav\/airport\/[A-Za-z0-9]{3,4}$/, /^search\/plans$/, /^plan\/\d+$/]
const forwardedHeaders = ['x-limit-cap', 'x-limit-used', 'x-page-current', 'x-page-count', 'x-item-count']

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const target = path.join('/')

  if (!allowedPaths.some((pattern) => pattern.test(target))) {
    return NextResponse.json({ message: 'Endpoint not allowed' }, { status: 404 })
  }

  const headers: Record<string, string> = { Accept: 'application/json', 'X-Units': 'AVIATION' }
  const apiKey = process.env.FPDB_API_KEY
  if (apiKey) headers.Authorization = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`

  try {
    const upstream = await fetch(`${API_BASE}/${target}${request.nextUrl.search}`, {
      headers,
      next: { revalidate: target.startsWith('nav/airport') ? 600 : 3600 },
    })
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
    return NextResponse.json({ message: 'Flight Plan Database is unreachable' }, { status: 502 })
  }
}
