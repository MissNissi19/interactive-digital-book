const letterWords: Record<string, string> = {
  A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf',
  H: 'Hotel', I: 'India', J: 'Juliet', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November',
  O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform',
  V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
}

const digitWords: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'niner', '.': 'decimal',
}

const spelledAbbreviations = new Set(['QNH', 'PTT', 'ATC', 'ATZ', 'AIP', 'FIS', 'AGL', 'ETA', 'NDB', 'ICAO', 'GF'])

type Accent = 'en-ZA' | 'en-GB'

const accentVoices: Record<Accent, string[]> = {
  'en-ZA': [
    'Tessa', 'Tessa (Enhanced)', 'Tessa (Premium)',
    'Google English (South Africa)', 'English (South Africa)',
    'Microsoft Leah Online (Natural) - English (South Africa)',
    'Microsoft Luke Online (Natural) - English (South Africa)',
  ],
  'en-GB': [
    'Daniel', 'Daniel (Enhanced)', 'Daniel (Premium)', 'Serena', 'Kate', 'Oliver', 'Arthur',
    'Google UK English Male', 'Google UK English Female',
    'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  ],
}

const accentLabels: Record<Accent, string> = {
  'en-ZA': 'South African',
  'en-GB': 'British',
}

let currentAccent: Accent = 'en-ZA'

function spellLetters(token: string) {
  return token.split('').map((char) => letterWords[char] ?? char).join(' ')
}

function spellDigits(token: string) {
  return token.split('').map((char) => digitWords[char] ?? char).join(' ')
}

function toSpeechText(input: string) {
  let text = input

  text = text.replace(/[…]+|\.{3,}/g, ', ')
  text = text.replace(/\(x\s?3\)/gi, ' times three')
  text = text.replace(/[—–]/g, ', ')
  text = text.replace(/·/g, ', ')
  text = text.replace(/&/g, ' and ')
  text = text.replace(/\s\/\s/g, ' or ')
  text = text.replace(/°/g, ' degrees')
  text = text.replace(/’/g, "'")

  text = text.replace(/\bC172\b/g, 'Cessna one seven two')
  text = text.replace(/\bP28A\b/g, 'Piper Cherokee')
  text = text.replace(/\bFL\s?(\d{2,3})\b/g, (_, digits: string) => `flight level ${spellDigits(digits)}`)
  text = text.replace(/\b(\d{4})z\b/gi, (_, digits: string) => `${spellDigits(digits)} zulu`)
  text = text.replace(/\b([A-Z]{2})-([A-Z]{2,3})\b/g, (_, prefix: string, suffix: string) => `${spellLetters(prefix)}, ${spellLetters(suffix)}`)
  text = text.replace(/\bQNH\s?(\d{3,4})\b/g, (_, digits: string) => `Q. N. H. ${spellDigits(digits)}`)
  text = text.replace(/\b(runway|Runway|frequency|Frequency|broadcast|Broadcast)\s(\d+(?:\.\d+)?)/g, (_, label: string, digits: string) => `${label} ${spellDigits(digits)}`)
  text = text.replace(/\b\d{2,3}\.\d{1,3}\b/g, (match) => spellDigits(match))

  text = text.replace(/\b[A-Z]{2,4}\b/g, (token) => {
    if (spelledAbbreviations.has(token)) return token.split('').join('. ') + '.'
    return spellLetters(token)
  })

  text = text.replace(/(\d)\s?nm\b/gi, '$1 nautical miles')
  text = text.replace(/\bft\b/gi, 'feet')
  text = text.replace(/\bhrs\b/gi, 'hours')

  text = text.replace(/(,\s*){2,}/g, ', ')
  return text.replace(/\s{2,}/g, ' ').replace(/^,\s*/, '').trim()
}

function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function normalizeLang(lang: string) {
  return lang.replace('_', '-').toLowerCase()
}

function englishVoices() {
  if (!isSpeechSupported()) return []
  return window.speechSynthesis.getVoices().filter((voice) => normalizeLang(voice.lang).startsWith('en'))
}

function pickVoiceForAccent(accent: Accent) {
  const english = englishVoices()
  if (!english.length) return null
  const target = accent.toLowerCase()
  for (const name of accentVoices[accent]) {
    const match = english.find((voice) => voice.name === name)
    if (match) return match
  }
  const byLang = english.find((voice) => normalizeLang(voice.lang) === target)
  if (byLang) return byLang
  if (accent === 'en-ZA') {
    const fallback = accentVoices['en-GB'].map((name) => english.find((voice) => voice.name === name)).find(Boolean)
    if (fallback) return fallback
  }
  return english.find((voice) => normalizeLang(voice.lang) === 'en-gb') ?? english.find((voice) => normalizeLang(voice.lang) === 'en-us') ?? english[0]
}

function pickEnglishVoice() {
  return pickVoiceForAccent(currentAccent)
}

function hasAccentVoice(accent: Accent) {
  const english = englishVoices()
  const target = accent.toLowerCase()
  return english.some((voice) => normalizeLang(voice.lang) === target || accentVoices[accent].includes(voice.name))
}

function setAccent(accent: Accent) {
  currentAccent = accent
}

function getAccent() {
  return currentAccent
}

type SpeakOptions = { rate?: number; onEnd?: () => void; accent?: Accent }

function speak(text: string, options: SpeakOptions = {}) {
  if (!isSpeechSupported()) return
  const utterance = new SpeechSynthesisUtterance(toSpeechText(text))
  const accent = options.accent ?? currentAccent
  const voice = pickVoiceForAccent(accent)
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? accent
  utterance.rate = options.rate ?? 0.92
  utterance.pitch = 1
  utterance.onend = () => options.onEnd?.()
  utterance.onerror = () => options.onEnd?.()
  window.speechSynthesis.speak(utterance)
}

function primeVoices(onReady?: () => void) {
  if (!isSpeechSupported()) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length) {
    onReady?.()
    return
  }
  const handler = () => {
    window.speechSynthesis.removeEventListener('voiceschanged', handler)
    onReady?.()
  }
  window.speechSynthesis.addEventListener('voiceschanged', handler)
}

function cancelSpeech() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

export type { Accent }
export { accentLabels, cancelSpeech, getAccent, hasAccentVoice, isSpeechSupported, pickEnglishVoice, primeVoices, setAccent, speak, toSpeechText }
