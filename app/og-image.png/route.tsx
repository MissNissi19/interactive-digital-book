import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'

const size = { width: 1200, height: 630 }

async function loadFont(query: string) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${query}`)).text()
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!url) return null
    return await (await fetch(url)).arrayBuffer()
  } catch {
    return null
  }
}

export async function GET() {
  const [serif, serifItalic] = await Promise.all([loadFont('Libre+Caslon+Text:wght@400'), loadFont('Libre+Caslon+Text:ital,wght@1,400')])
  const fonts = [
    ...(serif ? [{ name: 'Caslon', data: serif, style: 'normal' as const, weight: 400 as const }] : []),
    ...(serifItalic ? [{ name: 'Caslon', data: serifItalic, style: 'italic' as const, weight: 400 as const }] : []),
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#122438',
          backgroundImage: 'radial-gradient(circle at 20% 18%, rgba(229,189,105,0.12), transparent 40%), radial-gradient(circle at 80% 85%, rgba(229,189,105,0.06), transparent 45%)',
          fontFamily: 'Caslon, serif',
          color: '#f4eddf',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 76, height: 76, borderRadius: 999, border: '1.5px solid rgba(229,189,105,0.55)' }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#e5bd69" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 7v14" />
            <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
          </svg>
        </div>
        <div style={{ marginTop: 30, fontFamily: 'monospace', fontSize: 15, letterSpacing: 7, color: '#c99534' }}>A FIELD GUIDE FOR CLEAR COMMUNICATION</div>
        <div style={{ marginTop: 22, fontSize: 112, lineHeight: 1, color: '#f6efe2' }}>The</div>
        <div style={{ fontSize: 120, lineHeight: 1.1, fontStyle: 'italic', color: '#e5bd69' }}>Last Signal</div>
        <div style={{ marginTop: 26, fontSize: 26, color: 'rgba(246,239,226,0.7)', textAlign: 'center', maxWidth: 640 }}>
          An interactive notebook on the language we use when every word matters.
        </div>
        <div style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'monospace', fontSize: 13, letterSpacing: 5, color: 'rgba(246,239,226,0.4)' }}>
          <span>AVIATION RADIO</span>
          <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#c99534' }} />
          <span>INTERACTIVE MAPS</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  )
}
