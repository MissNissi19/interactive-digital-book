'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CloudSun, ExternalLink, LoaderCircle, PlaneLanding, PlaneTakeoff, Radio, Search, Sunrise, Sunset, Volume2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import RouteMap from '@/components/route-map'
import { cancelSpeech, primeVoices, speak } from '@/lib/speech'

type Runway = { ident: string; width: number; length: number; bearing: number; surface: string; ends: { ident: string }[] }
type Frequency = { type: string; frequency: number; name: string | null }
type Airport = {
  ICAO: string
  IATA: string | null
  name: string
  regionName: string | null
  elevation: number
  lat: number
  lon: number
  magneticVariation: number
  timezone: { name: string; offset: number } | null
  times: { sunrise: string; sunset: string; dawn: string; dusk: string } | null
  runwayCount: number
  runways: Runway[]
  frequencies: Frequency[]
  weather: { METAR: string | null; TAF: string | null } | null
}
type RouteNode = { type: string; ident: string; name: string | null; lat: number; lon: number; alt: number; via: { ident: string } | null }
type Plan = {
  id: number
  fromICAO: string
  toICAO: string
  fromName: string | null
  toName: string | null
  distance: number
  maxAltitude: number
  waypoints: number
  popularity: number
  notes: string | null
  tags: string[]
  route?: { nodes: RouteNode[] }
}
type Usage = { used: string | null; cap: string | null }

const quickAirports = ['FAGM', 'FAOR', 'FALA', 'FAWB', 'FARG', 'FACT']
const frequencyLabels: Record<string, string> = {
  TWR: 'Tower', GND: 'Ground', APP: 'Approach', DEP: 'Departure', ATIS: 'ATIS', CTR: 'Centre', REC: 'Information', UNIC: 'Unicom', CTAF: 'CTAF', AFIS: 'AFIS', FSS: 'Flight service',
}

async function fpdb<T>(path: string, onUsage: (usage: Usage) => void): Promise<T> {
  const response = await fetch(`https://api.flightplandatabase.com/${path}`, { headers: { Accept: 'application/json', 'X-Units': 'AVIATION' } })
  onUsage({ used: response.headers.get('x-limit-used'), cap: response.headers.get('x-limit-cap') })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 429) throw new Error('Daily request limit reached. Add an API key or try again later.')
    if (response.status === 404) throw new Error('Nothing found for that request.')
    throw new Error(data?.message ?? `Request failed (${response.status})`)
  }
  return data as T
}

function formatMHz(hz: number) {
  return (hz / 1_000_000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

function formatTime(iso: string | undefined, timeZone: string | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone })
  } catch {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
}

function describeMetar(metar: string) {
  const parts: string[] = []
  const wind = metar.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/)
  if (wind) {
    const direction = wind[1] === 'VRB' ? 'variable' : `${wind[1]} degrees`
    parts.push(`Wind ${direction} at ${Number(wind[2])} knots${wind[3] ? `, gusting ${Number(wind[3])}` : ''}`)
  }
  if (/\bCAVOK\b/.test(metar)) parts.push('Ceiling and visibility OK')
  else {
    const visibility = metar.match(/\s(\d{4})\s/)
    if (visibility) parts.push(visibility[1] === '9999' ? 'Visibility 10 km or more' : `Visibility ${Number(visibility[1])} metres`)
  }
  const cloudNames: Record<string, string> = { FEW: 'Few', SCT: 'Scattered', BKN: 'Broken', OVC: 'Overcast' }
  for (const cloud of metar.matchAll(/\b(FEW|SCT|BKN|OVC)(\d{3})/g)) parts.push(`${cloudNames[cloud[1]]} clouds at ${Number(cloud[2]) * 100} ft`)
  const temperature = metar.match(/\s(M?\d{2})\/(M?\d{2})\s/)
  if (temperature) {
    const toNumber = (value: string) => (value.startsWith('M') ? -Number(value.slice(1)) : Number(value))
    parts.push(`Temperature ${toNumber(temperature[1])}, dew point ${toNumber(temperature[2])}`)
  }
  const qnh = metar.match(/\bQ(\d{4})\b/)
  if (qnh) parts.push(`QNH ${qnh[1]}`)
  return parts
}

function AirportBriefing({ onUsage }: { onUsage: (usage: Usage) => void }) {
  const [query, setQuery] = useState('FAGM')
  const [airport, setAirport] = useState<Airport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (icao: string) => {
    const code = icao.trim().toUpperCase()
    if (!/^[A-Z0-9]{3,4}$/.test(code)) {
      setError('Enter a 4-letter ICAO code, e.g. FAGM.')
      return
    }
    setQuery(code)
    setLoading(true)
    setError(null)
    try {
      setAirport(await fpdb<Airport>(`nav/airport/${code}`, onUsage))
    } catch (err) {
      setAirport(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('FAGM')
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    load(query)
  }

  const metarLines = airport?.weather?.METAR ? describeMetar(airport.weather.METAR) : []
  const timeZone = airport?.timezone?.name

  const sayFrequency = (frequency: Frequency) => {
    cancelSpeech()
    const label = frequency.name ?? `${airport?.name ?? ''} ${frequencyLabels[frequency.type] ?? ''}`
    speak(`${label}, ${formatMHz(frequency.frequency)}`)
  }

  const sayWeather = () => {
    if (!airport || !metarLines.length) return
    cancelSpeech()
    speak(`${airport.name} weather. ${metarLines.join('. ')}.`)
  }

  return (
    <Card className="border-ink/10 bg-white/70 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
      <CardHeader className="border-b border-ink/10 bg-white/70 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass-dark">Airport briefing</p>
        <CardTitle className="mt-2 font-display text-3xl text-ink">Know the field before you call it</CardTitle>
        <CardDescription className="max-w-2xl font-serif text-base leading-relaxed">Runways, radio frequencies and the latest METAR for any airport, by ICAO code.</CardDescription>
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value.toUpperCase())} maxLength={4} aria-label="ICAO code" className="w-28 border-ink/15 bg-white font-mono uppercase tracking-[0.2em]" />
          <Button type="submit" disabled={loading} className="gap-2 bg-navy text-paper hover:bg-navy/90">
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />} Brief me
          </Button>
          <div className="flex flex-wrap gap-1.5">
            {quickAirports.map((code) => (
              <button key={code} type="button" onClick={() => load(code)} className={`rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.16em] transition ${airport?.ICAO === code ? 'border-navy bg-navy text-paper' : 'border-ink/15 text-ink/55 hover:border-brass hover:text-ink'}`}>{code}</button>
            ))}
          </div>
        </form>
      </CardHeader>
      <CardContent className="p-5">
        {error && <p className="flex items-center gap-2 rounded-lg border border-brass/40 bg-[#fbf0d8]/70 px-4 py-3 font-serif text-sm text-ink/75"><AlertTriangle className="size-4 text-brass-dark" />{error}</p>}
        {loading && !airport && <p className="flex items-center gap-2 font-mono text-xs text-ink/50"><LoaderCircle className="size-4 animate-spin" /> Contacting the database…</p>}
        {airport && (
          <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs tracking-[0.2em] text-brass-dark">{airport.ICAO}{airport.IATA ? ` · ${airport.IATA}` : ''}</p>
                <h3 className="mt-1 font-display text-4xl text-ink">{airport.name}</h3>
                {airport.regionName && <p className="font-serif text-ink/60">{airport.regionName}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-ink/10 bg-paper px-4 py-2"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">Elevation</p><p className="font-display text-xl text-ink">{Math.round(airport.elevation)} ft</p></div>
                <div className="rounded-lg border border-ink/10 bg-paper px-4 py-2"><p className="flex items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45"><Sunrise className="size-3" /> Sunrise</p><p className="font-display text-xl text-ink">{formatTime(airport.times?.sunrise, timeZone)}</p></div>
                <div className="rounded-lg border border-ink/10 bg-paper px-4 py-2"><p className="flex items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45"><Sunset className="size-3" /> Sunset</p><p className="font-display text-xl text-ink">{formatTime(airport.times?.sunset, timeZone)}</p></div>
              </div>
            </div>

            <div className="rounded-xl bg-navy p-5 text-paper">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-light"><CloudSun className="size-4" /> Weather</span>
                {metarLines.length > 0 && <Button onClick={sayWeather} variant="ghost" size="sm" className="gap-2 text-paper hover:bg-white/10 hover:text-white"><Volume2 className="size-4" /> Listen</Button>}
              </div>
              <p className="mt-3 font-mono text-sm text-paper/85">{airport.weather?.METAR ?? 'No METAR available for this airport.'}</p>
              {metarLines.length > 0 && <ul className="mt-3 grid gap-1 font-serif text-sm text-paper/70 sm:grid-cols-2">{metarLines.map((line) => <li key={line}>· {line}</li>)}</ul>}
              {airport.weather?.TAF && <p className="mt-4 border-t border-paper/15 pt-3 font-mono text-xs leading-relaxed text-paper/60">TAF {airport.weather.TAF}</p>}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45">Runways · {airport.runwayCount}</p>
                <div className="space-y-2">
                  {airport.runways.map((runway, index) => (
                    <div key={`${runway.ident}-${index}`} className="flex items-center justify-between rounded-lg border border-ink/10 bg-white/80 px-4 py-3">
                      <span className="font-display text-2xl text-ink">{runway.ident}</span>
                      <span className="text-right font-mono text-[11px] leading-relaxed text-ink/60">{Math.round(runway.length)} × {Math.round(runway.width)} ft<br />{runway.surface} · {Math.round(runway.bearing)}°</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45"><Radio className="size-3.5" /> Frequencies</p>
                {airport.frequencies.length === 0 && <p className="font-serif text-sm text-ink/55">No frequencies listed.</p>}
                <div className="space-y-2">
                  {airport.frequencies.map((frequency, index) => (
                    <button key={`${frequency.type}-${frequency.frequency}-${index}`} onClick={() => sayFrequency(frequency)} className="group flex w-full items-center justify-between rounded-lg border border-ink/10 bg-white/80 px-4 py-3 text-left transition hover:border-brass/60">
                      <span>
                        <span className="block font-serif text-ink">{frequency.name ?? frequencyLabels[frequency.type] ?? frequency.type}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">{frequencyLabels[frequency.type] ?? frequency.type}</span>
                      </span>
                      <span className="flex items-center gap-3"><span className="font-mono text-lg text-ink">{formatMHz(frequency.frequency)}</span><Volume2 className="size-4 text-ink/30 group-hover:text-ink" /></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RouteFinder({ onUsage }: { onUsage: (usage: Usage) => void }) {
  const [from, setFrom] = useState('FAOR')
  const [to, setTo] = useState('FACT')
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const search = async (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams({ limit: '8', sort: 'popularity' })
    if (from.trim()) params.set('fromICAO', from.trim().toUpperCase())
    if (to.trim()) params.set('toICAO', to.trim().toUpperCase())
    if (!params.has('fromICAO') && !params.has('toICAO')) {
      setError('Enter a departure or destination ICAO code.')
      return
    }
    setLoading(true)
    setError(null)
    setSelected(null)
    try {
      const results = await fpdb<Plan[]>(`search/plans?${params.toString()}`, onUsage)
      setPlans(results)
      if (!results.length) setError('No saved flight plans for that pair yet.')
    } catch (err) {
      setPlans(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const openPlan = async (plan: Plan) => {
    if (selected?.id === plan.id) {
      setSelected(null)
      return
    }
    setLoadingPlan(plan.id)
    setError(null)
    try {
      setSelected(await fpdb<Plan>(`plan/${plan.id}`, onUsage))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <Card className="border-ink/10 bg-white/70 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
      <CardHeader className="border-b border-ink/10 bg-white/70 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass-dark">Route finder</p>
        <CardTitle className="mt-2 font-display text-3xl text-ink">Flight plans other pilots have flown</CardTitle>
        <CardDescription className="max-w-2xl font-serif text-base leading-relaxed">Search the database by departure and destination, then open a plan to see every waypoint on the route.</CardDescription>
        <form onSubmit={search} className="mt-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-ink/15 bg-white pl-3"><PlaneTakeoff className="size-4 text-ink/45" /><Input value={from} onChange={(event) => setFrom(event.target.value.toUpperCase())} maxLength={4} aria-label="Departure ICAO" placeholder="FROM" className="w-24 border-0 font-mono uppercase tracking-[0.2em] shadow-none focus-visible:ring-0" /></label>
          <label className="flex items-center gap-2 rounded-md border border-ink/15 bg-white pl-3"><PlaneLanding className="size-4 text-ink/45" /><Input value={to} onChange={(event) => setTo(event.target.value.toUpperCase())} maxLength={4} aria-label="Destination ICAO" placeholder="TO" className="w-24 border-0 font-mono uppercase tracking-[0.2em] shadow-none focus-visible:ring-0" /></label>
          <Button type="submit" disabled={loading} className="gap-2 bg-navy text-paper hover:bg-navy/90">
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />} Find routes
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {error && <p className="flex items-center gap-2 rounded-lg border border-brass/40 bg-[#fbf0d8]/70 px-4 py-3 font-serif text-sm text-ink/75"><AlertTriangle className="size-4 text-brass-dark" />{error}</p>}
        {!plans && !error && <p className="font-serif text-sm text-ink/55">Try FAOR → FACT, or leave one field empty to see every route from or to an airport.</p>}
        {plans?.map((plan) => (
          <div key={plan.id} className="overflow-hidden rounded-lg border border-ink/10 bg-white/80">
            <button onClick={() => openPlan(plan)} className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-brass/5">
              <span>
                <span className="font-display text-xl text-ink">{plan.fromICAO} → {plan.toICAO}</span>
                <span className="block font-serif text-sm text-ink/55">{plan.fromName ?? '—'} to {plan.toName ?? '—'}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-ink/15 font-mono text-[10px]">{Math.round(plan.distance)} nm</Badge>
                <Badge variant="outline" className="border-ink/15 font-mono text-[10px]">{plan.waypoints} wpts</Badge>
                {plan.maxAltitude > 0 && <Badge variant="outline" className="border-ink/15 font-mono text-[10px]">{plan.maxAltitude.toLocaleString('en-GB')} ft</Badge>}
                {loadingPlan === plan.id && <LoaderCircle className="size-4 animate-spin text-ink/45" />}
              </span>
            </button>
            {selected?.id === plan.id && selected.route && (
              <div className="space-y-4 border-t border-ink/10 bg-paper/60 p-4">
                <RouteMap nodes={selected.route.nodes} />
                <ol className="grid gap-1.5 sm:grid-cols-2">
                  {selected.route.nodes.map((node, index) => (
                    <li key={`${node.ident}-${index}`} className="flex items-center gap-3 rounded-md border border-ink/10 bg-white/80 px-3 py-2">
                      <span className="w-6 font-mono text-[10px] text-ink/40">{index + 1}</span>
                      <span className="w-16 font-mono text-sm text-ink">{node.ident}</span>
                      <span className="flex-1 truncate font-serif text-xs text-ink/55">{node.name ?? node.via?.ident ?? ''}</span>
                      <span className="font-mono text-[10px] uppercase text-brass-dark">{node.type}</span>
                    </li>
                  ))}
                </ol>
                <a href={`https://flightplandatabase.com/plan/${plan.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brass-dark hover:text-ink">Open full plan <ExternalLink className="size-3.5" /></a>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function FlightPlannerChapter() {
  const [usage, setUsage] = useState<Usage>({ used: null, cap: null })

  useEffect(() => {
    primeVoices()
    return () => cancelSpeech()
  }, [])

  return (
    <motion.article
      key="planner"
      initial={{ opacity: 0, rotateY: -12, x: 24 }}
      animate={{ opacity: 1, rotateY: 0, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ perspective: 1400 }}
      className="mx-auto max-w-6xl"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brass-dark">Chapter 06 · Flight planner</p>
          <h2 className="mt-3 font-display text-5xl leading-none text-ink sm:text-7xl">Plan the <em className="text-brass-dark">route</em></h2>
        </div>
        <p className="max-w-xs font-serif text-base leading-relaxed text-ink/60">Live data for the airports and routes you have been practising on the radio.</p>
      </div>
      <Separator className="my-8 bg-ink/10" />

      <div className="space-y-8">
        <AirportBriefing onUsage={setUsage} />
        <RouteFinder onUsage={setUsage} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <a href="https://flightplandatabase.com" target="_blank" rel="noreferrer">
          <img src="https://static.flightplandatabase.com/images/data-banner/light.min.png" alt="Data from the Flight Plan Database" className="h-8" />
        </a>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
          Not for real-world navigation{usage.used && usage.cap ? ` · API ${usage.used}/${usage.cap} requests today` : ''}
        </p>
      </div>
    </motion.article>
  )
}

export default FlightPlannerChapter
