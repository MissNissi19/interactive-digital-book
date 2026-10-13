import { readFile } from 'node:fs/promises'
import path from 'node:path'

type RawRunway = [ident: string, length: number, width: number, surface: string, bearing: number]
type RawFrequency = [type: string, mhz: number, name: string | null]
type RawAirport = { n: string; i: string | null; la: number; lo: number; e: number; m: string | null; c: string; r: RawRunway[]; f: RawFrequency[] }
type RawNavaid = [ident: string, name: string, type: 'VOR' | 'NDB', lat: number, lon: number]
type RouteNode = { type: string; ident: string; name: string | null; lat: number; lon: number; alt: number; via: null }

const DATA_DIR = path.join(process.cwd(), 'data', 'airports')
const WEATHER_API = 'https://aviationweather.gov/api/data'
const EARTH_RADIUS_NM = 3440.065
const shardCache = new Map<string, Promise<Record<string, RawAirport>>>()
let navaidCache: Promise<RawNavaid[]> | null = null

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

function loadShard(key: string): Promise<Record<string, RawAirport>> {
  if (!/^[A-Z0-9]$/.test(key)) return Promise.resolve({})
  if (!shardCache.has(key)) {
    shardCache.set(key, readFile(path.join(DATA_DIR, `${key}.json`), 'utf8').then((text) => JSON.parse(text) as Record<string, RawAirport>).catch(() => ({})))
  }
  return shardCache.get(key)!
}

function loadNavaids(): Promise<RawNavaid[]> {
  navaidCache ??= readFile(path.join(DATA_DIR, 'navaids.json'), 'utf8').then((text) => JSON.parse(text) as RawNavaid[]).catch(() => [])
  return navaidCache
}

async function findAirport(code: string) {
  const icao = code.toUpperCase()
  const raw = (await loadShard(icao[0]))[icao]
  return raw ? { icao, ...raw } : null
}

async function fetchWeather(kind: 'metar' | 'taf', icao: string) {
  try {
    const response = await fetch(`${WEATHER_API}/${kind}?ids=${icao}&format=raw`, { signal: AbortSignal.timeout(5000), next: { revalidate: 600 } })
    if (!response.ok) return null
    const text = (await response.text()).replace(/\s+/g, ' ').replace(/^(METAR|SPECI|TAF)\s+/, '').trim()
    return text || null
  } catch {
    return null
  }
}

function sunEvent(lat: number, lon: number, date: Date, altitude: number) {
  const julianDate = date.getTime() / 86_400_000 + 2440587.5
  const day = Math.ceil(julianDate - 2451545 + 0.0008)
  const meanSolarTime = day - lon / 360
  const anomaly = (357.5291 + 0.98560028 * meanSolarTime) % 360
  const center = 1.9148 * Math.sin(toRad(anomaly)) + 0.02 * Math.sin(toRad(2 * anomaly)) + 0.0003 * Math.sin(toRad(3 * anomaly))
  const longitude = (anomaly + center + 180 + 102.9372) % 360
  const transit = 2451545 + meanSolarTime + 0.0053 * Math.sin(toRad(anomaly)) - 0.0069 * Math.sin(toRad(2 * longitude))
  const declination = Math.asin(Math.sin(toRad(longitude)) * Math.sin(toRad(23.4397)))
  const cosHourAngle = (Math.sin(toRad(altitude)) - Math.sin(toRad(lat)) * Math.sin(declination)) / (Math.cos(toRad(lat)) * Math.cos(declination))
  if (cosHourAngle < -1 || cosHourAngle > 1) return null
  const hourAngle = toDeg(Math.acos(cosHourAngle))
  const toIso = (julian: number) => new Date((julian - 2440587.5) * 86_400_000).toISOString()
  return { rise: toIso(transit - hourAngle / 360), set: toIso(transit + hourAngle / 360) }
}

function sunTimes(lat: number, lon: number) {
  const now = new Date()
  const sun = sunEvent(lat, lon, now, -0.833)
  const civil = sunEvent(lat, lon, now, -6)
  if (!sun || !civil) return null
  return { sunrise: sun.rise, sunset: sun.set, dawn: civil.rise, dusk: civil.set }
}

export async function localAirport(code: string) {
  const airport = await findAirport(code)
  if (!airport) return null
  const [METAR, TAF] = await Promise.all([fetchWeather('metar', airport.icao), fetchWeather('taf', airport.icao)])
  return {
    ICAO: airport.icao,
    IATA: airport.i,
    name: airport.n,
    regionName: [airport.m, airport.c].filter(Boolean).join(', ') || null,
    elevation: airport.e,
    lat: airport.la,
    lon: airport.lo,
    magneticVariation: 0,
    timezone: { name: 'UTC', offset: 0 },
    times: sunTimes(airport.la, airport.lo),
    runwayCount: airport.r.length,
    runways: airport.r.map(([ident, length, width, surface, bearing]) => ({ ident, length, width, surface, bearing, ends: ident.split('/').map((end) => ({ ident: end })) })),
    frequencies: airport.f.map(([type, mhz, name]) => ({ type, frequency: Math.round(mhz * 1_000_000), name })),
    weather: { METAR, TAF },
  }
}

function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)))
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  return Math.atan2(y, x)
}

function trackOffsets(fromLat: number, fromLon: number, toLat: number, toLon: number, lat: number, lon: number) {
  const angular = distanceNm(fromLat, fromLon, lat, lon) / EARTH_RADIUS_NM
  const angle = bearing(fromLat, fromLon, lat, lon) - bearing(fromLat, fromLon, toLat, toLon)
  const crossTrack = Math.asin(Math.sin(angular) * Math.sin(angle))
  const alongTrack = Math.acos(Math.max(-1, Math.min(1, Math.cos(angular) / Math.cos(crossTrack))))
  return { cross: Math.abs(crossTrack) * EARTH_RADIUS_NM, along: (Math.cos(angle) < 0 ? -1 : 1) * alongTrack * EARTH_RADIUS_NM }
}

async function routeWaypoints(from: { la: number; lo: number }, to: { la: number; lo: number }, total: number) {
  if (total < 40) return []
  const corridor = Math.min(40, Math.max(10, total * 0.08))
  const spacing = Math.min(150, Math.max(25, total / 8))
  const best = new Map<number, { navaid: RawNavaid; cross: number; along: number }>()
  for (const navaid of await loadNavaids()) {
    const [, , type, lat, lon] = navaid
    if (Math.abs(lat - from.la) > 30 && Math.abs(lat - to.la) > 30) continue
    const { cross, along } = trackOffsets(from.la, from.lo, to.la, to.lo, lat, lon)
    if (cross > corridor || along < spacing / 2 || along > total - spacing / 2) continue
    const bucket = Math.floor(along / spacing)
    const current = best.get(bucket)
    const better = !current || (type === 'VOR' && current.navaid[2] !== 'VOR') || (type === current.navaid[2] && cross < current.cross)
    if (better) best.set(bucket, { navaid, cross, along })
  }
  const ordered = [...best.values()].sort((a, b) => a.along - b.along)
  return ordered.filter((item, index) => index === 0 || item.along - ordered[index - 1].along >= spacing / 2).slice(0, 15)
}

export async function localRoute(fromCode: string, toCode: string) {
  const [from, to] = await Promise.all([findAirport(fromCode), findAirport(toCode)])
  if (!from || !to || from.icao === to.icao) return null
  const direct = distanceNm(from.la, from.lo, to.la, to.lo)
  const waypoints = await routeWaypoints(from, to, direct)
  const nodes: RouteNode[] = [
    { type: 'APT', ident: from.icao, name: from.n, lat: from.la, lon: from.lo, alt: 0, via: null },
    ...waypoints.map(({ navaid: [ident, name, type, lat, lon] }) => ({ type, ident, name, lat, lon, alt: 0, via: null })),
    { type: 'APT', ident: to.icao, name: to.n, lat: to.la, lon: to.lo, alt: 0, via: null },
  ]
  const distance = nodes.slice(1).reduce((sum, node, index) => sum + distanceNm(nodes[index].lat, nodes[index].lon, node.lat, node.lon), 0)
  const id = [...`${from.icao}${to.icao}`].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 1_000_000_007, 7)
  return {
    id,
    generated: true,
    fromICAO: from.icao,
    toICAO: to.icao,
    fromName: from.n,
    toName: to.n,
    distance,
    maxAltitude: 0,
    waypoints: nodes.length,
    popularity: 0,
    notes: null,
    tags: [],
    route: { nodes },
  }
}
