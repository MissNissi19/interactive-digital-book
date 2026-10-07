'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pause, Play, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Transcript, { type Scenario } from '@/components/radio-transcript'
import type { Accent } from '@/lib/speech'
import { accentLabels, cancelSpeech, getAccent, hasAccentVoice, isSpeechSupported, primeVoices, setAccent, speak } from '@/lib/speech'

const phoneticAlphabet: [string, string][] = [
  ['A', 'Alpha'], ['B', 'Bravo'], ['C', 'Charlie'], ['D', 'Delta'], ['E', 'Echo'], ['F', 'Foxtrot'],
  ['G', 'Golf'], ['H', 'Hotel'], ['I', 'India'], ['J', 'Juliet'], ['K', 'Kilo'], ['L', 'Lima'],
  ['M', 'Mike'], ['N', 'November'], ['O', 'Oscar'], ['P', 'Papa'], ['Q', 'Quebec'], ['R', 'Romeo'],
  ['S', 'Sierra'], ['T', 'Tango'], ['U', 'Uniform'], ['V', 'Victor'], ['W', 'Whiskey'], ['X', 'X-ray'],
  ['Y', 'Yankee'], ['Z', 'Zulu'],
]

const phoneticNumerals: [string, string][] = [
  ['0', 'Zero'], ['1', 'Wun'], ['2', 'Too'], ['3', 'Tree'], ['4', 'Fower'], ['5', 'Fife'],
  ['6', 'Six'], ['7', 'Seven'], ['8', 'Ait'], ['9', 'Niner'], ['.', 'Decimal'], ['10', 'Wun Zero'],
  ['00', 'Hundred'], ['000', 'Thousand'],
]

const standardPhrases: [string, string][] = [
  ['Affirm', 'Yes'],
  ['Negative', 'No / Not correct / Permission not granted'],
  ['Copy', 'Message understood'],
  ['Come in', 'Requesting a response'],
  ['Acknowledge', 'Let me know that you have received and understood this message'],
  ['Say again', 'Repeat all, or the following part of your last transmission'],
  ['Stand by', 'Wait a moment'],
  ['Go ahead', 'I am ready for your message'],
  ['Over', 'End of transmission'],
  ['Disregard', 'Ignore (consider transmission as not sent)'],
  ['Wilco', 'I will comply with your message'],
  ['Monitor', 'Listen out on frequency'],
  ['Re-cleared', 'A change has been made to your last clearance by this new clearance'],
  ['Break break', 'Separation between messages to different aircraft in the same transmission'],
  ['How do you read', 'How readable is my transmission'],
  ['Pan Pan (x3)', 'An urgent situation requiring immediate attention, but not life-threatening'],
  ['Mayday (x3)', 'Distress call — grave or imminent danger to life, immediate assistance required'],
]

const signalScale: [string, string][] = [
  ['1', 'Very weak, barely readable'],
  ['2', 'Poor, sometimes readable'],
  ['3', 'Fair, somewhat difficult to understand'],
  ['4', 'Good, easily readable'],
  ['5', 'Excellent, loud and clear'],
]

const keyConsiderations = [
  'Always listen out for 5 seconds before you push the PTT to transmit, to avoid interrupting other stations.',
  'Think before you transmit: decide what you are going to say and who it is meant for.',
  'Always identify yourself and the station you are addressing using proper call signs.',
  'When contacting a station start with your call sign; when replying end with your call sign.',
  'Speak clearly and concisely, at a normal pace, and keep messages short and to the point.',
  'Use standard radio phraseology as much as possible.',
  'Follow radio etiquette: be respectful and patient, give the other station time to reply, never interrupt.',
  'Be confident — ask “say again” if you did not understand, naming the part you missed.',
]

const radioCheck: Scenario = {
  id: 'radio-check',
  label: 'Radio check',
  title: 'Radio check with ATC',
  kicker: 'Before anything else',
  intro: 'Use the correct frequency: ensure your radio is tuned to the airport tower’s designated frequency (118.7 for FAGM), and turn the volume control up. After transmitting your radio check, listen carefully for the ATC’s response with a signal strength rating.',
  lines: [
    { role: 'pilot', text: 'Rand Tower, ZS-MOC, Radio Check on 118.7' },
    { role: 'tower', text: 'ZS-MOC, Rand Tower, reading strength 5, how do you read?' },
    { role: 'pilot', text: 'Strength 5, MOC' },
  ],
}

function PhrasesDeck() {
  const [playing, setPlaying] = useState<number | null>(null)
  const [playAll, setPlayAll] = useState(false)
  const [withMeaning, setWithMeaning] = useState(true)
  const [supported, setSupported] = useState(true)
  const playAllRef = useRef(false)

  useEffect(() => {
    setSupported(isSpeechSupported())
    primeVoices()
    return () => cancelSpeech()
  }, [])

  const stop = () => {
    playAllRef.current = false
    setPlayAll(false)
    setPlaying(null)
    cancelSpeech()
  }

  const speakAt = (index: number, chain: boolean) => {
    const [phrase, meaning] = standardPhrases[index]
    setPlaying(index)
    speak(withMeaning ? `${phrase}. ${meaning}` : phrase, { onEnd: () => {
      if (chain && playAllRef.current && index + 1 < standardPhrases.length) {
        speakAt(index + 1, true)
        return
      }
      if (chain) {
        playAllRef.current = false
        setPlayAll(false)
      }
      setPlaying((current) => (current === index ? null : current))
    } })
  }

  const playOne = (index: number) => {
    if (playing === index && !playAll) {
      stop()
      return
    }
    playAllRef.current = false
    setPlayAll(false)
    cancelSpeech()
    speakAt(index, false)
  }

  const togglePlayAll = () => {
    if (playAll) {
      stop()
      return
    }
    cancelSpeech()
    playAllRef.current = true
    setPlayAll(true)
    speakAt(playing !== null && playing + 1 < standardPhrases.length ? playing : 0, true)
  }

  return (
    <Card className="border-ink/10 bg-white/70 lg:col-span-2">
      <CardHeader className="border-b border-ink/10 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-2xl text-ink">Standard radio words &amp; phrases</CardTitle>
            <CardDescription>As per ICAO radio telephony phraseology. Tap any line to hear it.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setWithMeaning((value) => !value)}
              variant="outline"
              size="sm"
              className="border-ink/15 bg-transparent font-mono text-[10px] uppercase tracking-[0.15em] text-ink/60 hover:bg-ink/5"
            >
              {withMeaning ? 'Phrase + meaning' : 'Phrase only'}
            </Button>
            <Button onClick={togglePlayAll} disabled={!supported} size="sm" className="gap-2 bg-navy text-paper hover:bg-navy/90">
              {playAll ? <Pause className="size-4" /> : <Play className="size-4" />}
              {playAll ? 'Stop' : 'Play all'}
            </Button>
          </div>
        </div>
        {!supported && <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">Audio unavailable in this browser</p>}
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-2 p-5 md:grid-cols-2">
        {standardPhrases.map(([phrase, meaning], index) => {
          const active = playing === index
          return (
            <button
              key={phrase}
              onClick={() => playOne(index)}
              aria-label={`Play ${phrase}`}
              className={`group flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition ${active ? 'border-brass/60 bg-brass/10' : 'border-transparent hover:border-brass/30 hover:bg-brass/5'}`}
            >
              <span className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full transition ${active ? 'bg-brass text-navy' : 'bg-ink/5 text-ink/40 group-hover:bg-brass/20 group-hover:text-brass-dark'}`}>
                {active ? <Volume2 className="size-3.5" /> : <Play className="size-3.5" />}
              </span>
              <span className="flex-1 border-b border-ink/5 pb-1.5">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-brass-dark">{phrase}</span>
                <span className="block font-serif text-sm leading-relaxed text-ink/75">{meaning}</span>
              </span>
              {active && (
                <motion.span
                  aria-hidden
                  className="mt-2 flex h-4 items-end gap-0.5"
                  initial={false}
                >
                  {[0, 1, 2].map((bar) => (
                    <motion.span
                      key={bar}
                      className="w-0.5 rounded-full bg-brass"
                      animate={{ height: ['30%', '100%', '45%'] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: bar * 0.12 }}
                      style={{ height: '40%' }}
                    />
                  ))}
                </motion.span>
              )}
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}

function Reference() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-ink/10 bg-white/70">
        <CardHeader><CardTitle className="font-display text-2xl text-ink">Phonetic alphabet</CardTitle><CardDescription>Letter by letter, exactly as it left.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {phoneticAlphabet.map(([letter, word]) => (
            <div key={letter} className="flex items-baseline gap-2 border-b border-ink/5 py-1"><span className="font-mono text-sm text-brass-dark">{letter}</span><span className="font-serif text-sm text-ink/75">{word}</span></div>
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-6">
        <Card className="border-ink/10 bg-white/70">
          <CardHeader><CardTitle className="font-display text-2xl text-ink">Phonetic numerals</CardTitle><CardDescription>Numbers spoken so they cannot be mistaken.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {phoneticNumerals.map(([digit, word]) => (
              <div key={digit} className="flex items-baseline gap-2 border-b border-ink/5 py-1"><span className="font-mono text-sm text-brass-dark">{digit}</span><span className="font-serif text-sm text-ink/75">{word}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-brass/30 bg-[#fbf0d8]/70">
          <CardHeader><CardTitle className="font-display text-2xl text-ink">Signal strength scale</CardTitle><CardDescription>How readable you are, one to five.</CardDescription></CardHeader>
          <CardContent className="space-y-1.5">
            {signalScale.map(([score, meaning]) => (
              <div key={score} className="flex items-baseline gap-3 border-b border-brass/20 py-1 last:border-0"><span className="font-mono text-sm text-brass-dark">{score}</span><span className="font-serif text-sm text-ink/75">{meaning}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <PhrasesDeck />
      <Card className="border-navy/15 bg-navy text-paper lg:col-span-2">
        <CardHeader><CardTitle className="font-display text-2xl text-paper">Key considerations when using the radio</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2">
            {keyConsiderations.map((item) => (
              <li key={item} className="flex gap-3 font-serif text-sm leading-relaxed text-paper/75"><Check className="mt-0.5 size-4 shrink-0 text-brass-light" />{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function RadioProceduresChapter() {
  const [accent, setAccentState] = useState<Accent>(getAccent())
  const [missing, setMissing] = useState<Accent[]>([])

  useEffect(() => {
    primeVoices(() => {
      const unavailable = (['en-ZA', 'en-GB'] as Accent[]).filter((item) => !hasAccentVoice(item))
      setMissing(unavailable)
    })
  }, [])

  const chooseAccent = (value: Accent) => {
    cancelSpeech()
    setAccent(value)
    setAccentState(value)
    speak('Radio check, how do you read?', { accent: value })
  }

  return (
    <motion.article
      key="radio"
      initial={{ opacity: 0, rotateY: -12, x: 24 }}
      animate={{ opacity: 1, rotateY: 0, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ perspective: 1400 }}
      className="mx-auto max-w-6xl"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brass-dark">Chapter 04 · Radio procedures</p>
          <h2 className="mt-3 font-display text-5xl leading-none text-ink sm:text-7xl">Say it <em className="text-brass-dark">once</em></h2>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45">Listening accent</span>
          <div className="flex overflow-hidden rounded-full border border-ink/15">
            {(['en-ZA', 'en-GB'] as Accent[]).map((item) => (
              <button
                key={item}
                onClick={() => chooseAccent(item)}
                aria-pressed={accent === item}
                className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition ${accent === item ? 'bg-navy text-paper' : 'text-ink/50 hover:bg-ink/5 hover:text-ink'}`}
              >
                {accentLabels[item]}
              </button>
            ))}
          </div>
          {missing.includes(accent) && (
            <span className="max-w-56 text-right font-mono text-[10px] leading-relaxed tracking-[0.1em] text-brass-dark">
              {accent === 'en-ZA' ? 'No South African voice installed — add “Tessa” in System Settings › Spoken Content. Using British for now.' : 'No British voice installed — using the closest English voice.'}
            </span>
          )}
        </div>
      </div>
      <p className="mt-6 max-w-xs font-serif text-base leading-relaxed text-ink/60">Every call has a shape. Learn the shape and the words arrive on their own.</p>
      <Separator className="my-8 bg-ink/10" />
      <p className="max-w-3xl font-serif text-xl leading-relaxed text-ink/75">A working reference for the radio: the phonetic alphabet and numerals, the radio check, the standard words and phrases, and the key considerations before you press to transmit.</p>

      <div className="mt-8 space-y-8">
        <Reference />
        <Transcript scenario={radioCheck} />
      </div>
    </motion.article>
  )
}

export { phoneticAlphabet, phoneticNumerals }
export default RadioProceduresChapter
