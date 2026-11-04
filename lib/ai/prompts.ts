/** Shared prompt material for the AI features. Server-side only. */

export const BOOK_REFERENCE = `Book: "The Last Signal", an interactive English course on aviation radio communication (VFR flying in South Africa around Rand airport and the General Flying Area).
Chapters: 01 The radio (NATO/ICAO phonetic alphabet), 02 Signal & silence, 03 Exercises (listen & identify, read back clearances, spell call signs), 04 Radio procedures, 05 General Flying Area (scenarios with transcripts), 06 Flight planner (route map), 07 Tests (timed 8-minute radio exam, pass mark 70%).
Key facts from the book:
- Phonetic alphabet: Alfa, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliett, Kilo, Lima, Mike, November, Oscar, Papa, Quebec, Romeo, Sierra, Tango, Uniform, Victor, Whiskey, X-ray, Yankee, Zulu. Call sign ZS-PTA is spelled "Zulu Sierra Papa Tango Alfa"; after first contact it may be shortened to the last three letters (e.g. "PTA").
- "Roger" = I have received all of your last message. "Wilco" = I will comply. "Negative" = no / permission not granted. "Say again" = repeat your last transmission (never "repeat please"). "Correction" = I made an error, the correct version is… "Stand by" = wait.
- Before pressing the PTT, listen out for about 5 seconds so you do not transmit over someone else.
- When replying or reading back, your call sign goes at the END of the transmission.
- Read back clearances, runway numbers, hold-short instructions, QNH, altitudes/flight levels and frequencies word for word, then your call sign. Example: Tower "KSF taxi to holding point Runway 35, hold short Runway 29, QNH 1027" → readback "QNH 1027, taxi to holding point Runway 35, hold short Runway 29, KSF".
- Signal strength (readability) scale 1–5: 1 unreadable, 2 readable now and then, 3 readable with difficulty, 4 readable, 5 loud and clear (perfectly readable).
- Rand Tower frequency 118.7. Leaving the Rand ATZ overhead the Silver Ball (Special Rules South) you broadcast on 125.6.
- When flying SOLO you may only do an orbit on the downwind leg. If tower asks you to orbit while on final, say "Unable to comply, I will do a Go Around".
- Standard overhead join at an uncontrolled airfield: approach at 2000 ft AGL.`

export const ENGLISH_STYLE = `Students come from many countries and English may not be their first language. Write in clear, simple English with short sentences. Use plain text only: no markdown headings, no tables, no bold markers; short lines or simple "- " bullets are fine. Only state frequencies, numbers and procedures that appear in the book reference or the material you are given; if you are not sure, say so and point the student to the relevant chapter. This is training material, not a substitute for an instructor or official procedures.`

export interface LearnerProfile {
  name?: string | null
  level?: string | null
  nativeLanguage?: string | null
  country?: string | null
}

export function describeLearner(profile: LearnerProfile): string {
  const parts = [
    profile.name && `name ${profile.name}`,
    profile.level && `level ${profile.level}`,
    profile.nativeLanguage && `native language ${profile.nativeLanguage}`,
    profile.country && `from ${profile.country}`,
  ].filter(Boolean)
  return parts.length ? `About the student: ${parts.join(', ')}.` : ''
}

export const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
