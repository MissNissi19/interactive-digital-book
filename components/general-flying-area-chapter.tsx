'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import Transcript, { type Scenario } from '@/components/radio-transcript'
import type { Accent } from '@/lib/speech'
import { accentLabels, cancelSpeech, getAccent, primeVoices, setAccent, speak } from '@/lib/speech'

const scenarios: Scenario[] = [
  {
    id: 'gfa-departure',
    label: 'GFA departure',
    title: 'Radio procedures: General Flying Area',
    kicker: 'Page 3 · Departing FAGM',
    intro: 'A General Flying Area (GF) refers to an airspace for non-commercial activities like sport flying, leisure flying, pilot training etc. The one we primarily use is the Johannesburg Flight Training Area FAD182.',
    lines: [
      { role: 'pilot', text: 'Good day Signal Tower, this is ZS-ABC' },
      { role: 'tower', text: 'ZS-ABC, Signal Tower Good day, Go Ahead' },
      { role: 'pilot', text: 'ABC C172 …… Crew onboard ……hrs Duration ……hrs Endurance, requesting taxi instructions for a flight to the Johannesburg General Flying Area' },
      { role: 'tower', text: 'ABC taxi to holding point Runway 35, hold short Runway 29, QNH 10…' },
      { role: 'pilot', text: 'QNH 10…, taxi to holding point Runway 35, hold short Runway 29, ABC' },
      { role: 'action', text: 'Commence taxi to hold short Runway 29' },
      { role: 'pilot', text: 'ABC request to cross Runway 29' },
      { role: 'tower', text: 'ABC cross Runway 29' },
      { role: 'pilot', text: 'Cross Runway 29, ABC' },
      { role: 'action', text: 'Continue to taxi to the run-up bay and do pre-take off checks' },
      { role: 'action', text: 'Once pre-take off checks complete, taxi to the holding point' },
      { role: 'pilot', text: 'ABC ready at holding point Runway 35' },
      { role: 'tower', text: 'ABC line up and wait Runway 35' },
      { role: 'pilot', text: 'Line up and wait Runway 35, ABC' },
      { role: 'action', text: 'Line up on the runway and wait for clearance' },
      { role: 'tower', text: 'ABC, surface wind ……, Runway 35, Cleared for take-off, left hand turn, report outbound Silver Ball 6300 ft' },
      { role: 'pilot', text: 'Cleared for take-off Runway 35, left hand turn, report outbound Silver Ball 6300 ft, ABC' },
      { role: 'action', text: 'Commence take-off and follow clearance instructions. On reaching the Silver Ball:' },
      { role: 'pilot', text: 'ABC, overhead Silver Ball 6300 ft' },
      { role: 'tower', text: 'ABC, Broadcast 125.6' },
      { role: 'pilot', text: 'Broadcast 125.6, ABC' },
    ],
    notes: ['Visual reference points on this departure: the Silver Ball and the PPC factory.'],
  },
  {
    id: 'traffic-on-final',
    label: 'Traffic on final',
    title: 'Traffic on final approach',
    kicker: 'Page 4 · Departing behind traffic',
    intro: 'If an aircraft is on final while you are at the holding point, tower will check that you have it in sight before clearing you.',
    lines: [
      { role: 'pilot', text: 'ABC ready at holding point Runway 35' },
      { role: 'tower', text: 'ABC, Confirm traffic on Final approach Runway 35 in sight' },
      { role: 'pilot', text: 'Affirm traffic in sight, ABC' },
      { role: 'action', text: 'Say “Negative” instead, if the traffic is not in sight' },
      { role: 'tower', text: 'ABC, behind traffic Final approach, line up and wait, Runway 35 behind' },
      { role: 'pilot', text: 'Behind traffic Final approach, line up and wait, Runway 35 behind, ABC' },
      { role: 'action', text: 'Line up on the runway and wait for clearance' },
      { role: 'tower', text: 'ABC, surface wind ……, Runway 35, Cleared for take-off, left hand turn, report outbound Silver Ball 6300 ft' },
      { role: 'pilot', text: 'Cleared for take-off Runway 35, left hand turn, report outbound Silver Ball 6300 ft, ABC' },
    ],
    notes: ['The word “behind” is said twice in the clearance and must be read back both times.'],
  },
  {
    id: 'special-rules',
    label: 'Special rules areas',
    title: 'Radio procedures: JHB Special Rules Area',
    kicker: 'Page 5 · Leaving the FAGM ATZ',
    intro: 'When leaving the Signal Airport Aerodrome Traffic Zone (FAGM ATZ) overhead the Silver Ball you enter the JHB Special Rules South Area and change frequency to 125.6. If routing outbound to the north you enter JHB Special Rules West Area on 125.8.',
    lines: [
      { role: 'action', text: 'Template: Traffic addressing · Who and type · Where · Altitude · Routing · Who' },
      { role: 'pilot', text: 'Traffic Special Rules South, ZS-ABC C172, Overhead the Silver Ball at 6300 ft climbing to 7000 ft on QNH 1024, routing to the JHB General Flying Area via the hippo quarry next, ABC' },
      { role: 'pilot', text: 'Traffic Special Rules West, ZS-ABC C172, 1nm east of Sandton City at 7500 ft, routing to Wonderboom, ABC' },
      { role: 'pilot', text: 'Traffic Special Rules East, ZS-ABC P28A, 5nm North East of Heidelberg Airfield at 7000 ft, changing frequency 125.9, ABC' },
    ],
    notes: ['The same template is used when entering the General Flying Area on frequency 122.35 (FAD182 — Johannesburg Flight Training Area).'],
  },
  {
    id: 'inbound-fagm',
    title: 'Radio procedures: routing back to Signal Airport (FAGM)',
    label: 'Inbound to Signal',
    kicker: 'Pages 8–9 · Inbound from the GFA',
    intro: 'When routing back from the General Flying Area, call inbound overhead Mall of the South maintaining 6500 ft. If no contact or clearance is established by Romeo Delta (NDB beacon), commence orbits while broadcasting 125.6 and monitoring 118.7.',
    lines: [
      { role: 'pilot', text: 'Signal Tower Good day, this is ZS-ABC' },
      { role: 'tower', text: 'ZS-ABC, Signal Tower Good day, Go Ahead' },
      { role: 'pilot', text: 'Overhead Mall of the South 6500 ft, …… Crew onboard ……hrs Endurance, Inbound from GFA, requesting inbound clearance for a full stop, ABC' },
      { role: 'tower', text: 'ABC QNH 1022, join and report right downwind Runway 17 at 6500 ft' },
      { role: 'pilot', text: 'Join and report right downwind Runway 17 at 6500 ft, QNH 1022, ABC' },
      { role: 'action', text: 'Continue to join the right downwind via Makro Alberton, and once established:' },
      { role: 'pilot', text: 'ABC Right downwind Runway 17 at 6500 ft, full stop' },
      { role: 'tower', text: 'ABC Report Final approach Runway 17, number 3, number 2 on base' },
      { role: 'action', text: 'A number is given for you, followed by how many aircraft are in front of you and where they are' },
      { role: 'pilot', text: 'Report Final approach Runway 17 number 3, ABC' },
      { role: 'action', text: 'Continue to finals and once established:' },
      { role: 'pilot', text: 'ABC Final approach Runway 17' },
      { role: 'tower', text: 'ABC, Surface wind ……, Runway 17, Cleared to Land' },
      { role: 'action', text: 'Wind direction and speed will be given to you, which you must take into account carefully' },
      { role: 'pilot', text: 'Cleared to Land Runway 17, ABC' },
    ],
    notes: [
      'Remember to do DOWNWIND CHECKS before entering base.',
      'The same applies when cleared to join either left base Runway 35 or right base Runway 11.',
    ],
  },
  {
    id: 'circuits',
    label: 'Circuits',
    title: 'Radio procedures: Circuits',
    kicker: 'Pages 10–11 · Touch and go',
    lines: [
      { role: 'pilot', text: 'Good day Signal Tower, this is ZS-ABC' },
      { role: 'tower', text: 'ZS-ABC, Signal Tower Good day, Go Ahead' },
      { role: 'pilot', text: 'ABC C172 …… Crew onboard ……hrs Duration ……hrs Endurance, requesting taxi instructions for Circuits, ABC' },
      { role: 'tower', text: 'ABC taxi to holding point Runway 11, cross Runway 35, QNH 1027' },
      { role: 'pilot', text: 'QNH 1027, taxi to holding point Runway 11, cross Runway 35, ABC' },
      { role: 'action', text: 'Commence taxi to the run-up bay' },
      { role: 'action', text: 'Before crossing Runway 35, turn transponder to ALT and all lights ON' },
      { role: 'action', text: 'At the run-up bay do pre-take off checks, then taxi to the holding point' },
      { role: 'pilot', text: 'ABC ready at holding point Runway 11' },
      { role: 'tower', text: 'ABC do you require Full length or Intersection for departure?' },
      { role: 'pilot', text: 'Full length for departure, ABC' },
      { role: 'tower', text: 'ABC, enter backtrack Runway 11 and report ready on the turnaround' },
      { role: 'pilot', text: 'Enter backtrack Runway 11 and report ready on the turnaround, ABC' },
      { role: 'action', text: 'As you enter backtrack runway, turn transponder to ALT and all lights ON' },
      { role: 'pilot', text: 'ABC, ready for take-off Runway 11' },
      { role: 'tower', text: 'ABC, surface wind ……, Runway 11, Cleared for take-off, right hand turn, report right downwind 6300 ft' },
      { role: 'pilot', text: 'Cleared for take-off Runway 11, right hand turn, report right downwind 6300 ft, ABC' },
      { role: 'action', text: 'Commence take-off and follow clearance instructions. Once on the downwind:' },
      { role: 'pilot', text: 'ABC, right downwind Runway 11, 6300 ft, touch and go' },
      { role: 'tower', text: 'ABC, report Final approach Runway 11 number 2, number 1 on short final' },
      { role: 'action', text: 'A number is given for you, followed by how many aircraft are in front of you and where they are' },
      { role: 'pilot', text: 'Report Final approach Runway 11 number 2, ABC' },
      { role: 'action', text: 'Once on Final approach:' },
      { role: 'pilot', text: 'ABC, Final approach Runway 11' },
      { role: 'tower', text: 'ABC, surface wind ……, Runway 11, Cleared touch and go' },
      { role: 'action', text: 'Wind direction and speed will be given to you, which you must take into account carefully' },
      { role: 'pilot', text: 'Cleared touch and go Runway 11, ABC' },
    ],
    notes: [
      'When using Runway 11, turn shortly before you reach the Pick n Pay reference point to avoid entering O.R. Tambo airspace.',
      'If climb performance is slow, the minimum altitude before turning must be 5800 ft.',
      'Do After take-off checks before turning.',
      'Circuit visual reference points for Runways 11 / 29 and 35 / 17: the railway, the cemetery and Lambton — explained in detail at Ex 12 & 13.',
    ],
  },
  {
    id: 'go-around',
    label: 'Go around',
    title: 'Go around',
    kicker: 'Page 11 · Unstable approach',
    intro: 'You do not need to request a go around — always initiate it first and then communicate it.',
    lines: [
      { role: 'action', text: 'In the event you have an unstable approach and you are unable to land, initiate a Go Around:' },
      { role: 'pilot', text: 'ABC Going Around, Runway 11' },
      { role: 'tower', text: 'ABC observed on the go around, report right Downwind Runway 11 at 6300 ft' },
      { role: 'pilot', text: 'Report right Downwind Runway 11 at 6300 ft, ABC' },
      { role: 'action', text: 'In the event that Tower calls for a Go Around:' },
      { role: 'tower', text: 'ABC Go Around, I say again Go Around, report right Downwind Runway 11 at 6300 ft' },
      { role: 'pilot', text: 'Going Around, report right Downwind Runway 11 at 6300 ft, ABC' },
    ],
  },
  {
    id: 'orbits',
    label: 'Orbits',
    title: 'Orbits',
    kicker: 'Page 12 · Holding your slot',
    lines: [
      { role: 'action', text: 'In the event that Tower requires you to do an Orbit:' },
      { role: 'tower', text: 'ABC commence 1 left orbit and report re-established right Downwind Runway 11' },
      { role: 'pilot', text: 'Commence 1 left orbit and report re-established right Downwind Runway 11, ABC' },
      { role: 'action', text: 'Do a 360° turn. Once you re-establish position on the downwind:' },
      { role: 'pilot', text: 'ABC re-established right Downwind Runway 11' },
      { role: 'tower', text: 'ABC, report Final approach Runway 11 number 2, number 1 is in Final' },
      { role: 'pilot', text: 'Report Final approach Runway 11 number 2, ABC' },
      { role: 'action', text: 'In the event that Tower requires an Orbit while on Base, Final or Upwind → opt to do a Go Around:' },
      { role: 'tower', text: 'ABC commence 1 left orbit and report re-established left Base Runway 11' },
      { role: 'pilot', text: 'Unable to comply, I will do a Go Around, ABC' },
    ],
    notes: ['When SOLO you may only do an Orbit on Downwind — NOT on Base, Final or Upwind.'],
  },
  {
    id: 'fis',
    label: 'Flight information',
    title: 'Radio procedures: speaking to Flight Information Service',
    kicker: 'Page 14 · The dumbbell method',
    intro: 'When communicating with Johannesburg South FIS we use the dumbbell method.',
    lines: [
      { role: 'pilot', text: 'Info South, Good day, this is ZS-ABC' },
      { role: 'info', text: 'ZS-ABC, Good day, Go Ahead' },
      { role: 'pilot', text: 'ABC C172, airborne Signal Airport, 0700z, overhead Fochville at 7000 ft, requesting FL085, routing Klerksdorp, ETA 0900z, ABC' },
      { role: 'info', text: 'ZS-ABC, no reported traffic for the climb FL085, report maintaining' },
      { role: 'pilot', text: 'No reported traffic, report maintaining FL085, ABC' },
      { role: 'action', text: 'Continue the climb and once established:' },
      { role: 'pilot', text: 'ABC maintaining FL085' },
      { role: 'info', text: 'ABC report ready for the descend or when you have the field in sight' },
      { role: 'pilot', text: 'Report ready for descend or field in sight, ABC' },
      { role: 'action', text: 'When ready for descend:' },
      { role: 'pilot', text: 'ABC ready for descend' },
      { role: 'info', text: 'ABC traffic to affect the descend is a Piper Cherokee on your 12 o’clock approximately 6nm, Klerksdorp QNH 1018, broadcast 123.0 report airborne next' },
      { role: 'pilot', text: 'I will keep a good lookout for traffic, QNH 1018, broadcast 123.0 and report airborne next, ABC' },
    ],
  },
  {
    id: 'unmanned-joining',
    label: 'Unmanned joining',
    title: 'Radio procedures: unmanned joining procedure',
    kicker: 'Pages 15–16 · Standard overhead join',
    intro: 'To join an uncontrolled circuit in accordance with the Standard Overhead Joining Procedure always approach the airfield at 2000 ft AGL or as per AIP, and make the first radio call at approximately 5–10nm inbound. Template: Traffic addressing · Who and type · Details · QNH · Intention · Who.',
    lines: [
      { role: 'action', text: 'Example when starting at an uncontrolled airfield (including Signal Airport when the tower is closed / unmanned):' },
      { role: 'pilot', text: 'Signal Traffic, ZS-ABC C172, parked Hanger 33, …… Crew onboard ……hrs Duration ……hrs Endurance, taxiing to holding point Runway 35, will hold short Runway 29, QNH 1026, for Circuits / Flight to General Flying Area, ABC' },
      { role: 'action', text: 'Then report when crossing a runway, entering a runway, rolling on the runway, when airborne and when on every leg in the circuit' },
      { role: 'action', text: 'Example when entering FARG airfield, elevation 3700 ft, Runway 16/34:' },
      { role: 'pilot', text: '1 · Rustenburg Traffic, ZS-ABC C172, inbound from the East approximately 5nm to join overhead the airfield at 5700 ft, QNH 1020, ABC' },
      { role: 'pilot', text: '2 · Rustenburg Traffic, ABC C172, overhead the airfield at 5700 ft for a windsock inspection, ABC' },
      { role: 'pilot', text: '3 · Rustenburg Traffic, ABC C172, descending on the western side of the airfield to 4700 ft to join left Downwind Runway 16, ABC' },
      { role: 'pilot', text: '4 · Rustenburg Traffic, ABC, overhead threshold 34 to join left Downwind Runway 16, ABC' },
      { role: 'pilot', text: '5 · Rustenburg Traffic, ABC, left Downwind Runway 16 touch and go, ABC' },
      { role: 'pilot', text: '6 · Rustenburg Traffic, ABC, left Base Runway 16 touch and go, ABC' },
      { role: 'pilot', text: '7 · Rustenburg Traffic, ABC, Final Approach Runway 16 touch and go, ABC' },
    ],
    notes: [
      'Descend on the dead side from 2000 ft AGL to circuit altitude of 1000 ft AGL before joining downwind on the live side.',
      'Please refer to pages 135–136 of the Essential Radio Book by Caroline Koll.',
    ],
  },
  {
    id: 'leaving-unmanned',
    label: 'Leaving unmanned',
    title: 'After touch and go: leaving an unmanned airspace',
    kicker: 'Pages 17–18 · Outbound',
    lines: [
      { role: 'pilot', text: 'Rustenburg Traffic, ABC airborne Runway 16' },
      { role: 'pilot', text: 'Rustenburg Traffic, ABC left crosswind Runway 16' },
      { role: 'action', text: 'Continue the climb to circuit altitude' },
      { role: 'pilot', text: 'Rustenburg Traffic, ABC left Downwind Runway 16, 4700 ft routing overhead the field' },
      { role: 'pilot', text: 'Rustenburg Traffic, ABC overhead the field climbing to 5700 ft routing south towards Krugersdorp' },
      { role: 'action', text: 'At 5nm outbound:' },
      { role: 'pilot', text: 'Rustenburg Traffic, ABC 5nm south of the airfield, outbound, changing frequency to 124.8' },
    ],
    notes: ['Climb to 2000 ft AGL once clear of the circuit, overhead the field.'],
  },
  {
    id: 'other-controlled',
    label: 'Other controlled airspace',
    title: 'Radio procedures: flying to other controlled airspaces',
    kicker: 'Page 19 · Wonderboom & Lanseria',
    lines: [
      { role: 'action', text: 'Example with Wonderboom airport:' },
      { role: 'pilot', text: 'Wonderboom Tower, Good day, this is ZS-ABC' },
      { role: 'tower', text: 'ZS-ABC, Wonderboom Tower Good day, Go Ahead' },
      { role: 'pilot', text: 'ABC Piper Cherokee …… Crew onboard ……hrs Endurance, airborne Rustenburg 0930z overhead Rosslyn at 6500 ft, requesting a touch and go, routing to Signal Airport, ABC' },
      { role: 'tower', text: 'ABC cleared inbound 5500 ft, QNH 1021, join and report right Downwind Runway 29 overhead Bon Accord Dam at 5100 ft' },
      { role: 'pilot', text: 'Cleared inbound 5500 ft, QNH 1021, join and report right Downwind Runway 29 overhead Bon Accord Dam at 5100 ft, ABC' },
      { role: 'action', text: 'Example with Lanseria International airport:' },
      { role: 'pilot', text: 'Lanseria Tower, Good day, this is ZS-ABC' },
      { role: 'tower', text: 'ZS-ABC, Lanseria Tower Good day, Go Ahead' },
      { role: 'pilot', text: 'ABC C172 …… Crew onboard ……hrs Endurance, airborne FAGM 0930z, overhead Tracking Station at 6500 ft, requesting inbound clearance for a touch and go, thereafter routing back to Signal, ABC' },
      { role: 'tower', text: 'ABC cleared inbound not above 5500 ft, QNH 1021, join and report left Downwind Runway 07 at 5500 ft' },
      { role: 'pilot', text: 'Cleared inbound not above 5500 ft, QNH 1021, join and report left Downwind Runway 07 at 5500 ft, ABC' },
    ],
  },
]

function GeneralFlyingAreaChapter() {
  const [accent, setAccentState] = useState<Accent>(getAccent())
  const [active, setActive] = useState(scenarios[0].id)

  useEffect(() => {
    primeVoices()
    return () => cancelSpeech()
  }, [])

  const chooseAccent = (value: Accent) => {
    cancelSpeech()
    setAccent(value)
    setAccentState(value)
    speak('Radio check, how do you read?', { accent: value })
  }

  const jumpTo = (id: string) => {
    setActive(id)
    cancelSpeech()
  }

  return (
    <motion.article
      key="gfa"
      initial={{ opacity: 0, rotateY: -12, x: 24 }}
      animate={{ opacity: 1, rotateY: 0, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ perspective: 1400 }}
      className="mx-auto max-w-6xl"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brass-dark">Chapter 05 · General Flying Area</p>
          <h2 className="mt-3 font-display text-5xl leading-none text-ink sm:text-7xl">Out to the <em className="text-brass-dark">area</em></h2>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45">Listening accent</span>
          <div className="flex overflow-hidden rounded-full border border-ink/15" role="group" aria-label="Listening accent">
            {(['en-ZA', 'en-GB'] as Accent[]).map((item) => (
              <button
                key={item}
                onClick={() => chooseAccent(item)}
                aria-pressed={accent === item}
                className={`px-4 py-2 font-mono font-semibold text-[10px] uppercase tracking-[0.16em] transition ${accent === item ? 'bg-navy text-paper' : 'text-brass-dark hover:bg-brass/10 hover:text-ink'}`}
              >
                {accentLabels[item]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Separator className="my-8 bg-ink/10" />
      <p className="max-w-3xl font-serif text-xl leading-relaxed text-ink/75">Every exchange from the General Flying Area departure onwards: special rules areas, the route home to Signal, circuits, go arounds and orbits, flight information service, unmanned airfields and other controlled airspaces.</p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="General Flying Area sections">
        {scenarios.map((item) => (
          <button
            key={item.id}
            onClick={() => jumpTo(item.id)}
            className={`rounded-full px-4 py-2 font-mono font-semibold text-[10px] uppercase tracking-[0.16em] transition ${active === item.id ? 'bg-navy text-paper' : 'text-brass-dark hover:bg-brass/10 hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {scenarios.filter((item) => item.id === active).map((item) => <Transcript key={item.id} scenario={item} />)}
      </div>
    </motion.article>
  )
}

export { scenarios as generalFlyingAreaScenarios }
export default GeneralFlyingAreaChapter
