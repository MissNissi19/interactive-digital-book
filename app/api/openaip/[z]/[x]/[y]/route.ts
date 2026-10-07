import { NextResponse, type NextRequest } from 'next/server'

const TILE_BASE = 'https://api.tiles.openaip.net/api/data/openaip'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params
  const tileY = y.replace(/\.png$/, '')

  if (![z, x, tileY].every((value) => /^\d+$/.test(value)) || Number(z) > 20) {
    return NextResponse.json({ message: 'Invalid tile' }, { status: 400 })
  }

  const apiKey = process.env.OPENAIP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'OPENAIP_API_KEY is not configured' }, { status: 503 })
  }

  try {
    const upstream = await fetch(`${TILE_BASE}/${z}/${x}/${tileY}.png`, {
      headers: { 'x-openaip-api-key': apiKey },
      next: { revalidate: 86400 },
    })
    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status })
    }
    return new NextResponse(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return NextResponse.json({ message: 'OpenAIP is unreachable' }, { status: 502 })
  }
}
