import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE = 'https://davidmegginson.github.io/ourairports-data'
const OUT_DIR = path.join(process.cwd(), 'data', 'airports')
const AIRPORT_TYPES = new Set(['large_airport', 'medium_airport', 'small_airport'])
const NAVAID_TYPES = new Set(['VOR', 'VOR-DME', 'VORTAC', 'NDB', 'NDB-DME'])
const SURFACES = [
  [/^(ASP|ASPH|BIT|TAR|PAV|PEM)/, 'Asphalt'],
  [/^(CON|PCC)/, 'Concrete'],
  [/^(GRS|GRASS|TURF)/, 'Grass'],
  [/^(GRE|GRV|GVL|GRAVEL)/, 'Gravel'],
  [/^(DIRT|DRT|EARTH|SOIL|CLA|CLAY|LAT)/, 'Dirt'],
  [/^(SAN|SAND)/, 'Sand'],
  [/^(WATER|WAT)/, 'Water'],
]

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += char
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [header, ...data] = rows
  return data.filter((cells) => cells.length === header.length).map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index]])))
}

async function load(name) {
  const response = await fetch(`${SOURCE}/${name}.csv`)
  if (!response.ok) throw new Error(`Failed to download ${name}.csv (${response.status})`)
  const rows = parseCsv(await response.text())
  console.log(`${name}.csv: ${rows.length} rows`)
  return rows
}

const isCode = (value) => /^[A-Z0-9]{4}$/.test(value ?? '')
const num = (value) => (value === '' || value === undefined ? null : Number(value))
const round = (value, digits) => (value === null ? null : Number(value.toFixed(digits)))

function surfaceName(raw) {
  const value = (raw ?? '').toUpperCase().trim()
  if (!value) return 'Unknown'
  return SURFACES.find(([pattern]) => pattern.test(value))?.[1] ?? raw
}

function runwayBearing(runway) {
  const heading = num(runway.le_heading_degT)
  if (heading !== null && !Number.isNaN(heading)) return Math.round(heading)
  const digits = runway.le_ident.match(/^(\d{1,2})/)
  return digits ? Number(digits[1]) * 10 : 0
}

const [airports, runways, frequencies, navaids, countries] = await Promise.all(['airports', 'runways', 'airport-frequencies', 'navaids', 'countries'].map(load))

const countryNames = Object.fromEntries(countries.map((country) => [country.code, country.name]))
const byRef = new Map()
const shards = {}

for (const airport of airports) {
  if (!AIRPORT_TYPES.has(airport.type)) continue
  const code = [airport.icao_code, airport.gps_code, airport.ident].find(isCode)
  if (!code) continue
  const shard = (shards[code[0]] ??= {})
  if (shard[code] && !isCode(airport.icao_code)) continue
  const entry = {
    n: airport.name,
    i: airport.iata_code || null,
    la: round(num(airport.latitude_deg), 5),
    lo: round(num(airport.longitude_deg), 5),
    e: num(airport.elevation_ft) ?? 0,
    m: airport.municipality || null,
    c: countryNames[airport.iso_country] ?? airport.iso_country,
    r: [],
    f: [],
  }
  shard[code] = entry
  byRef.set(airport.id, entry)
}

for (const runway of runways) {
  const entry = byRef.get(runway.airport_ref)
  if (!entry || runway.closed === '1') continue
  const ident = [runway.le_ident, runway.he_ident].filter(Boolean).join('/')
  entry.r.push([ident || '—', num(runway.length_ft) ?? 0, num(runway.width_ft) ?? 0, surfaceName(runway.surface), runwayBearing(runway)])
}

for (const frequency of frequencies) {
  const entry = byRef.get(frequency.airport_ref)
  const mhz = num(frequency.frequency_mhz)
  if (!entry || !mhz) continue
  entry.f.push([frequency.type.toUpperCase(), mhz, frequency.description || null])
}

const navaidList = navaids
  .filter((navaid) => NAVAID_TYPES.has(navaid.type) && navaid.latitude_deg && navaid.longitude_deg)
  .map((navaid) => [navaid.ident, navaid.name, navaid.type.startsWith('NDB') ? 'NDB' : 'VOR', round(num(navaid.latitude_deg), 5), round(num(navaid.longitude_deg), 5)])

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })
let total = 0
for (const [key, shard] of Object.entries(shards)) {
  total += Object.keys(shard).length
  await writeFile(path.join(OUT_DIR, `${key}.json`), JSON.stringify(shard))
}
await writeFile(path.join(OUT_DIR, 'navaids.json'), JSON.stringify(navaidList))
await writeFile(path.join(OUT_DIR, 'meta.json'), JSON.stringify({ source: 'OurAirports (public domain)', url: 'https://ourairports.com/data/', generatedAt: new Date().toISOString(), airports: total, navaids: navaidList.length }, null, 2))
console.log(`Wrote ${total} airports in ${Object.keys(shards).length} shards and ${navaidList.length} navaids to ${OUT_DIR}`)
