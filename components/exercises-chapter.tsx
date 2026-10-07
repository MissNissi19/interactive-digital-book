'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Headphones, Keyboard, RotateCcw, SpellCheck, Volume2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { generalFlyingAreaScenarios } from '@/components/general-flying-area-chapter'
import { phoneticAlphabet } from '@/components/radio-procedures-chapter'
import type { Accent } from '@/lib/speech'
import { accentLabels, cancelSpeech, getAccent, primeVoices, setAccent, speak } from '@/lib/speech'

export function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[.,;:!?'"’\-–—()/·…]/g, ' ').replace(/\s+/g, ' ').trim()
}

type ListenQuestion = { said: string; options: string[] }

function buildListenQuestions(): ListenQuestion[] {
  const pool = generalFlyingAreaScenarios
    .flatMap((scenario) => scenario.lines)
    .filter((line) => line.role !== 'action' && line.text.length > 40 && line.text.length < 140)
    .map((line) => line.text)
  const distinct = Array.from(new Set(pool))
  const picked = shuffle(distinct).slice(0, 8)
  return picked.map((said) => {
    const distractors = shuffle(distinct.filter((option) => option !== said && option.slice(0, 12) !== said.slice(0, 12))).slice(0, 3)
    return { said, options: shuffle([said, ...distractors]) }
  })
}

const readbackDrills: { prompt: string; model: string; required: string[] }[] = [
  {
    prompt: 'Tower: “KSF taxi to holding point Runway 35, hold short Runway 29, QNH 1027”',
    model: 'QNH 1027, taxi to holding point Runway 35, hold short Runway 29, KSF',
    required: ['1027', 'holding point', '35', 'hold short', '29', 'KSF'],
  },
  {
    prompt: 'Tower: “KSF, surface wind 290 10 knots, Runway 35, Cleared for take-off, left hand turn, report outbound Silver Ball 6300 ft”',
    model: 'Cleared for take-off Runway 35, left hand turn, report outbound Silver Ball 6300 ft, KSF',
    required: ['cleared', 'take off', '35', 'left hand turn', 'silver ball', '6300', 'KSF'],
  },
  {
    prompt: 'Tower: “SVH QNH 1022, join and report right downwind Runway 17 at 6500 ft”',
    model: 'Join and report right downwind Runway 17 at 6500 ft, QNH 1022, SVH',
    required: ['join', 'report', 'right downwind', '17', '6500', '1022', 'SVH'],
  },
  {
    prompt: 'Tower: “KBW cleared inbound 5500 ft, QNH 1021, join and report right Downwind Runway 29 overhead Bon Accord Dam at 5100 ft”',
    model: 'Cleared inbound 5500 ft, QNH 1021, join and report right Downwind Runway 29 overhead Bon Accord Dam at 5100 ft, KBW',
    required: ['cleared inbound', '5500', '1021', 'right downwind', '29', 'bon accord', '5100', 'KBW'],
  },
  {
    prompt: 'Info: “ZS-NBN, no reported traffic for the climb FL085, report maintaining”',
    model: 'No reported traffic, report maintaining FL085, NBN',
    required: ['no reported traffic', 'report maintaining', 'flight level', 'NBN'],
  },
]

const spellingItems = ['ZS-MOC', 'ZS-KSF', 'ZS-NBN', 'ZS-SVH', 'ZS-OFU', 'ZS-KBW', 'ZS-JZS', 'ZS-KCZ']

const letterWordMap = new Map(phoneticAlphabet.map(([letter, word]) => [letter, word]))

function expectedSpelling(callsign: string) {
  return callsign.replace(/-/g, '').split('').map((char) => letterWordMap.get(char) ?? char).join(' ')
}

export function ScoreBar({ done, total, correct }: { done: number; total: number; correct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-brass transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/50">{done}/{total} · {correct} correct</span>
    </div>
  )
}

function ListenExercise() {
  const [questions, setQuestions] = useState<ListenQuestion[] | null>(null)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(0)

  const start = () => {
    cancelSpeech()
    setQuestions(buildListenQuestions())
    setIndex(0)
    setPicked(null)
    setCorrect(0)
    setDone(0)
  }

  const question = questions?.[index]
  const finished = questions !== null && index >= questions.length

  const replay = () => {
    if (!question) return
    cancelSpeech()
    speak(question.said)
  }

  const answer = (option: number) => {
    if (picked !== null || !question) return
    setPicked(option)
    setDone((value) => value + 1)
    if (question.options[option] === question.said) setCorrect((value) => value + 1)
    cancelSpeech()
  }

  const next = () => {
    cancelSpeech()
    setPicked(null)
    setIndex((value) => value + 1)
  }

  return (
    <Card className="border-ink/10 bg-white/70 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
      <CardHeader className="border-b border-ink/10 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-brass-dark"><Headphones className="size-4" /> Listen &amp; identify</p>
            <CardTitle className="mt-2 font-display text-3xl text-ink">What did they say?</CardTitle>
            <CardDescription className="mt-2 max-w-2xl font-serif text-base leading-relaxed">Hear a real transmission from the book and pick the words you heard. Train the ear, not the eye.</CardDescription>
          </div>
          {questions && <Button onClick={start} variant="outline" size="sm" className="gap-2 border-ink/15 bg-transparent"><RotateCcw className="size-4" /> Restart</Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {!questions && (
          <Button onClick={start} className="gap-2 bg-navy text-paper hover:bg-navy/90"><Volume2 className="size-4" /> Start listening</Button>
        )}
        {question && (
          <>
            <ScoreBar done={done} total={questions.length} correct={correct} />
            <div className="flex items-center gap-3">
              <Button onClick={replay} className="gap-2 bg-navy text-paper hover:bg-navy/90"><Volume2 className="size-4" /> Play transmission</Button>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">Question {index + 1} of {questions.length}</span>
            </div>
            <div className="grid gap-2">
              {question.options.map((option, optionIndex) => {
                const isAnswer = option === question.said
                const isPicked = picked === optionIndex
                const reveal = picked !== null
                const style = reveal
                  ? isAnswer
                    ? 'border-brass bg-brass/15 text-ink'
                    : isPicked
                      ? 'border-red-800/40 bg-red-900/10 text-ink/70'
                      : 'border-ink/10 text-ink/45'
                  : 'border-ink/10 text-ink hover:border-brass/60'
                return (
                  <button key={optionIndex} onClick={() => answer(optionIndex)} disabled={reveal} className={`flex items-start gap-3 rounded-lg border bg-white/80 px-4 py-3 text-left font-serif text-sm transition ${style}`}>
                    <span className="mt-0.5 shrink-0">{reveal && isAnswer ? <Check className="size-4 text-brass-dark" /> : reveal && isPicked ? <X className="size-4 text-red-800/70" /> : <span className="size-4" />}</span>
                    {option}
                  </button>
                )
              })}
            </div>
            {picked !== null && (
              <Button onClick={next} className="gap-2 bg-navy text-paper hover:bg-navy/90">{index + 1 < questions.length ? 'Next' : 'See score'} <ChevronRight className="size-4" /></Button>
            )}
          </>
        )}
        {finished && (
          <div className="rounded-lg border border-brass/40 bg-[#fbf0d8]/70 p-5 text-center">
            <p className="font-display text-4xl text-ink">{correct} / {questions.length}</p>
            <p className="mt-1 font-serif text-sm text-ink/60">{correct === questions.length ? 'Strength 5 — loud and clear.' : correct >= questions.length / 2 ? 'Readable with difficulty — run it again.' : 'Go back to the transcripts and listen first.'}</p>
            <Button onClick={start} className="mt-4 gap-2 bg-navy text-paper hover:bg-navy/90"><RotateCcw className="size-4" /> Try again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReadbackExercise() {
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(0)

  const drill = readbackDrills[index]
  const finished = index >= readbackDrills.length
  const missing = checked ? drill.required.filter((token) => !normalizeText(value).includes(normalizeText(token))) : []
  const passed = checked && missing.length === 0

  const check = () => {
    if (checked || !value.trim()) return
    setChecked(true)
    setDone((count) => count + 1)
    if (drill.required.every((token) => normalizeText(value).includes(normalizeText(token)))) setCorrect((count) => count + 1)
    cancelSpeech()
  }

  const listen = () => {
    cancelSpeech()
    speak(drill.prompt.replace(/^(Tower|Info): “/, '$1 says. ').replace(/”$/, ''))
  }

  const next = () => {
    setValue('')
    setChecked(false)
    setIndex((step) => step + 1)
  }

  const restart = () => {
    setIndex(0)
    setValue('')
    setChecked(false)
    setCorrect(0)
    setDone(0)
  }

  return (
    <Card className="border-ink/10 bg-white/70 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
      <CardHeader className="border-b border-ink/10 pb-5">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-brass-dark"><Keyboard className="size-4" /> Read back the clearance</p>
        <CardTitle className="mt-2 font-display text-3xl text-ink">Type what you would transmit</CardTitle>
        <CardDescription className="mt-2 max-w-2xl font-serif text-base leading-relaxed">Read back the instruction word for word — the details are the safety.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {!finished && (
          <>
            <ScoreBar done={done} total={readbackDrills.length} correct={correct} />
            <div className="flex items-start gap-3 rounded-lg border border-brass/40 bg-brass/10 px-4 py-3">
              <p className="flex-1 font-serif text-base leading-relaxed text-ink">{drill.prompt}</p>
              <Button onClick={listen} variant="ghost" size="icon" aria-label="Listen to instruction" className="size-8 shrink-0 text-ink/40 hover:text-ink"><Volume2 className="size-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && check()} placeholder="Your readback…" disabled={checked} aria-label="Your readback" className="min-w-56 flex-1 border-ink/15 bg-white font-serif" />
              <Button onClick={check} disabled={checked || !value.trim()} className="gap-2 bg-navy text-paper hover:bg-navy/90"><Check className="size-4" /> Check</Button>
            </div>
            {checked && (
              <div className={`rounded-lg border p-4 ${passed ? 'border-brass/50 bg-brass/10' : 'border-red-800/30 bg-red-900/5'}`}>
                {passed ? (
                  <p className="flex items-center gap-2 font-serif text-sm text-ink"><Check className="size-4 text-brass-dark" /> Correct readback — call sign at the end, details intact.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 font-serif text-sm text-ink"><X className="size-4 text-red-800/70" /> Missing: <span className="font-mono text-xs text-red-800/80">{missing.join(' · ')}</span></p>
                    <p className="font-serif text-sm text-ink/60">Model: <em>{drill.model}</em></p>
                  </div>
                )}
                <Button onClick={next} className="mt-3 gap-2 bg-navy text-paper hover:bg-navy/90">{index + 1 < readbackDrills.length ? 'Next' : 'See score'} <ChevronRight className="size-4" /></Button>
              </div>
            )}
          </>
        )}
        {finished && (
          <div className="rounded-lg border border-brass/40 bg-[#fbf0d8]/70 p-5 text-center">
            <p className="font-display text-4xl text-ink">{correct} / {readbackDrills.length}</p>
            <p className="mt-1 font-serif text-sm text-ink/60">{correct === readbackDrills.length ? 'Clean readbacks — tower approves.' : 'Read back every clearance, especially the numbers.'}</p>
            <Button onClick={restart} className="mt-4 gap-2 bg-navy text-paper hover:bg-navy/90"><RotateCcw className="size-4" /> Try again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SpellingExercise() {
  const [items, setItems] = useState(() => spellingItems)
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(0)

  const callsign = items[index]
  const finished = index >= items.length
  const expected = callsign ? expectedSpelling(callsign) : ''
  const normalizeAnswer = (input: string) => normalizeText(input).replace(/\balfa\b/g, 'alpha')
  const passed = checked && normalizeAnswer(value) === normalizeAnswer(expected)

  const check = () => {
    if (checked || !value.trim()) return
    setChecked(true)
    setDone((count) => count + 1)
    if (normalizeAnswer(value) === normalizeAnswer(expected)) setCorrect((count) => count + 1)
    cancelSpeech()
  }

  const next = () => {
    setValue('')
    setChecked(false)
    setIndex((step) => step + 1)
  }

  const restart = () => {
    setItems(shuffle(spellingItems))
    setIndex(0)
    setValue('')
    setChecked(false)
    setCorrect(0)
    setDone(0)
  }

  return (
    <Card className="border-ink/10 bg-white/70 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
      <CardHeader className="border-b border-ink/10 pb-5">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-brass-dark"><SpellCheck className="size-4" /> Spell it in NATO</p>
        <CardTitle className="mt-2 font-display text-3xl text-ink">Say the call sign properly</CardTitle>
        <CardDescription className="mt-2 max-w-2xl font-serif text-base leading-relaxed">Write the phonetic spelling of each call sign, e.g. “Zulu Sierra Mike Oscar Charlie”.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {!finished && (
          <>
            <ScoreBar done={done} total={items.length} correct={correct} />
            <p className="text-center font-display text-5xl tracking-wide text-ink">{callsign}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && check()} placeholder="e.g. zulu sierra mike oscar charlie" disabled={checked} aria-label="Phonetic spelling" className="w-full max-w-lg border-ink/15 bg-white text-center font-serif" />
            </div>
            <div className="flex justify-center">
              <Button onClick={check} disabled={checked || !value.trim()} className="gap-2 bg-navy text-paper hover:bg-navy/90"><Check className="size-4" /> Check</Button>
            </div>
            {checked && (
              <div className={`rounded-lg border p-4 ${passed ? 'border-brass/50 bg-brass/10' : 'border-red-800/30 bg-red-900/5'}`}>
                {passed ? (
                  <p className="flex items-center justify-center gap-2 font-serif text-sm text-ink"><Check className="size-4 text-brass-dark" /> Perfect spelling.</p>
                ) : (
                  <p className="text-center font-serif text-sm text-ink/70">Expected: <em className="text-ink">{expected}</em></p>
                )}
                <div className="mt-3 flex justify-center"><Button onClick={next} className="gap-2 bg-navy text-paper hover:bg-navy/90">{index + 1 < items.length ? 'Next' : 'See score'} <ChevronRight className="size-4" /></Button></div>
              </div>
            )}
          </>
        )}
        {finished && (
          <div className="rounded-lg border border-brass/40 bg-[#fbf0d8]/70 p-5 text-center">
            <p className="font-display text-4xl text-ink">{correct} / {items.length}</p>
            <p className="mt-1 font-serif text-sm text-ink/60">{correct === items.length ? 'Every letter lands clean.' : 'Review the alphabet in chapter 01 and retry.'}</p>
            <Button onClick={restart} className="mt-4 gap-2 bg-navy text-paper hover:bg-navy/90"><RotateCcw className="size-4" /> Try again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExercisesChapter() {
  const [accent, setAccentState] = useState<Accent>(getAccent())

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

  return (
    <motion.article
      key="exercises"
      initial={{ opacity: 0, rotateY: -12, x: 24 }}
      animate={{ opacity: 1, rotateY: 0, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ perspective: 1400 }}
      className="mx-auto max-w-6xl"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brass-dark">Chapter 03 · Exercises</p>
          <h2 className="mt-3 font-display text-5xl leading-none text-ink sm:text-7xl">Prove it on the <em className="text-brass-dark">radio</em></h2>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45">Listening accent</span>
          <div className="flex overflow-hidden rounded-full border border-ink/15" role="group" aria-label="Listening accent">
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
        </div>
      </div>
      <Separator className="my-8 bg-ink/10" />
      <p className="max-w-3xl font-serif text-xl leading-relaxed text-ink/75">Three drills built from the transmissions you studied — hear a call and identify it, read back a clearance, spell call signs in the NATO alphabet. Prove it all afterwards in chapter 07.</p>

      <div className="mt-8 space-y-8">
        <ListenExercise />
        <ReadbackExercise />
        <SpellingExercise />
      </div>
    </motion.article>
  )
}

export default ExercisesChapter
