'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Lightbulb, RotateCcw, Volume2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import RadioProceduresChapter from '@/components/radio-procedures-chapter'
import GeneralFlyingAreaChapter from '@/components/general-flying-area-chapter'
import FlightPlannerChapter from '@/components/flight-planner-chapter'
import ExercisesChapter from '@/components/exercises-chapter'
import TestsChapter from '@/components/tests-chapter'
import type { Accent } from '@/lib/speech'
import { accentLabels, cancelSpeech, getAccent, primeVoices, setAccent, speak } from '@/lib/speech'

const alphabet = [
  ['A', 'Alfa', 'AL-fah'], ['B', 'Bravo', 'BRAH-voh'], ['C', 'Charlie', 'CHAR-lee'], ['D', 'Delta', 'DELL-tah'],
  ['E', 'Echo', 'ECK-oh'], ['F', 'Foxtrot', 'FOKS-trot'], ['G', 'Golf', 'GOLF'], ['H', 'Hotel', 'hoh-TELL'],
  ['I', 'India', 'IN-dee-ah'], ['J', 'Juliett', 'JEW-lee-ett'], ['K', 'Kilo', 'KEY-loh'], ['L', 'Lima', 'LEE-mah'],
  ['M', 'Mike', 'MIKE'], ['N', 'November', 'noh-VEM-ber'], ['O', 'Oscar', 'OSS-cah'], ['P', 'Papa', 'pah-PAH'],
  ['Q', 'Quebec', 'keh-BECK'], ['R', 'Romeo', 'ROW-mee-oh'], ['S', 'Sierra', 'see-AIR-rah'], ['T', 'Tango', 'TANG-go'],
  ['U', 'Uniform', 'YOU-nee-form'], ['V', 'Victor', 'VIK-tah'], ['W', 'Whiskey', 'WISS-key'], ['X', 'X-ray', 'ECKS-ray'],
  ['Y', 'Yankee', 'YANG-key'], ['Z', 'Zulu', 'ZOO-loo'],
]

const chapters = [
  { id: 'cover', label: 'Cover' },
  { id: 'nato', label: '01 · The radio' },
  { id: 'signal', label: '02 · Signal & silence' },
  { id: 'exercises', label: '03 · Exercises' },
  { id: 'radio', label: '04 · Radio procedures' },
  { id: 'gfa', label: '05 · General Flying Area' },
  { id: 'planner', label: '06 · Flight planner' },
  { id: 'tests', label: '07 · Tests' },
]

function toNato(value: string) {
  return value.toUpperCase().split('').map((char) => {
    const entry = alphabet.find(([letter]) => letter === char)
    return entry ? entry[1] : char === ' ' ? '·' : char
  }).join('  ')
}

function NatoLab() {
  const [selected, setSelected] = useState(0)
  const [text, setText] = useState('MEET AT DAWN')
  const [accent, setAccentState] = useState<Accent>(getAccent())
  const current = alphabet[selected]

  useEffect(() => {
    primeVoices()
    return () => cancelSpeech()
  }, [])

  const playCurrent = () => {
    cancelSpeech()
    speak(current[1])
  }

  const chooseAccent = (value: Accent) => {
    cancelSpeech()
    setAccent(value)
    setAccentState(value)
    speak(current[1], { accent: value })
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <Card className="overflow-hidden border-ink/10 bg-white/75 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
        <CardHeader className="border-b border-ink/10 bg-white/70 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div><CardTitle className="font-display text-2xl text-ink">The flight deck</CardTitle><CardDescription className="mt-1">Tap a card to study the call sign.</CardDescription></div>
            <Badge variant="outline" className="border-brass/50 bg-brass/10 text-brass-dark">{selected + 1} / 26</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="mb-5 rounded-xl bg-navy px-5 py-6 text-paper shadow-inner">
            <div className="flex items-start justify-between"><span className="font-mono text-xs uppercase tracking-[0.3em] text-paper/55">Letter</span><span className="font-mono text-xs uppercase tracking-[0.2em] text-paper/55">NATO / ICAO</span></div>
            <div className="mt-4 flex items-end justify-between"><span className="font-display text-7xl leading-none">{current[0]}</span><div className="text-right"><p className="font-display text-3xl">{current[1]}</p><p className="mt-1 font-mono text-sm text-brass-light">{current[2]}</p></div></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Button onClick={playCurrent} variant="ghost" size="sm" className="gap-2 text-paper hover:bg-white/10 hover:text-white"><Volume2 data-icon="inline-start" /> Listen to pronunciation</Button>
              <div className="flex overflow-hidden rounded-full border border-paper/25" role="group" aria-label="Listening accent">
                {(['en-ZA', 'en-GB'] as Accent[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => chooseAccent(item)}
                    aria-pressed={accent === item}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition ${accent === item ? 'bg-brass text-navy' : 'text-paper/55 hover:bg-white/10 hover:text-paper'}`}
                  >
                    {accentLabels[item]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
            {alphabet.map(([letter, word], index) => <button key={letter} aria-label={`${letter} for ${word}`} onClick={() => setSelected(index)} className={`flex aspect-square items-center justify-center rounded-lg border font-mono text-sm transition hover:-translate-y-0.5 ${selected === index ? 'border-brass bg-brass text-navy shadow-md' : 'border-ink/10 bg-paper text-ink/65 hover:border-brass/60'}`}>{letter}</button>)}
          </div>
        </CardContent>
      </Card>
      <Card className="border-brass/30 bg-[#fbf0d8]/80 shadow-[0_14px_40px_rgba(23,37,52,0.06)]">
        <CardHeader><div className="flex items-center gap-2 text-brass-dark"><Lightbulb data-icon="inline-start" /><span className="font-mono text-xs uppercase tracking-[0.2em]">Practice lab</span></div><CardTitle className="font-display text-2xl text-ink">Spell it out</CardTitle><CardDescription>Turn any phrase into a clear radio transmission.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4"><Textarea value={text} onChange={(event) => setText(event.target.value)} aria-label="Phrase to convert" className="min-h-24 resize-none border-brass/30 bg-white/70 font-mono text-sm text-ink focus-visible:ring-brass" placeholder="Type a phrase..." /><div className="rounded-lg border border-dashed border-brass/40 bg-white/60 p-4"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-dark">Transmission</p><p className="font-display text-lg leading-relaxed text-ink">{toNato(text)}</p></div><Button onClick={() => setText('')} variant="outline" className="w-fit gap-2 border-brass/40 bg-transparent text-ink hover:bg-brass/10"><RotateCcw data-icon="inline-start" /> Clear phrase</Button></CardContent>
      </Card>
    </div>
  )
}

function Cover({ onOpen }: { onOpen: () => void }) {
  return <motion.section initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="relative mx-auto flex min-h-[min(700px,calc(100vh-150px))] max-w-5xl items-center justify-center overflow-hidden rounded-[2rem] border border-paper/20 bg-navy px-6 py-20 text-center shadow-[0_30px_80px_rgba(11,24,39,.3)]"><div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(214,169,77,.3),transparent_26%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,.08),transparent_30%)]" /><div className="relative flex max-w-2xl flex-col items-center"><div className="mb-8 flex size-16 items-center justify-center rounded-full border border-brass/60 text-brass-light"><BookOpen className="size-7" /></div><p className="font-mono text-xs uppercase tracking-[0.45em] text-brass-light">A field guide for clear communication</p><h1 className="mt-7 font-display text-6xl leading-[.92] tracking-tight text-paper sm:text-8xl">The<br /><em className="text-brass-light">Last Signal</em></h1><p className="mx-auto mt-8 max-w-md font-serif text-lg leading-relaxed text-paper/65">An interactive notebook on the language we use when every word matters.</p><Button onClick={onOpen} size="lg" className="mt-10 gap-3 bg-brass px-8 text-navy shadow-lg shadow-brass/20 hover:bg-brass-light"><BookOpen data-icon="inline-start" /> Open book <ArrowRight data-icon="inline-end" /></Button><div className="mt-16 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/35"><span>Edition 01</span><span className="size-1 rounded-full bg-brass/70" /><span>Interactive reader</span></div></div></motion.section>
}

function Chapter({ chapter }: { chapter: string }) {
  if (chapter === 'radio') return <RadioProceduresChapter />
  if (chapter === 'gfa') return <GeneralFlyingAreaChapter />
  if (chapter === 'planner') return <FlightPlannerChapter />
  if (chapter === 'tests') return <TestsChapter />
  if (chapter === 'exercises') return <ExercisesChapter />
  if (chapter === 'nato') return <motion.article key="nato" initial={{ opacity: 0, rotateY: -12, x: 24 }} animate={{ opacity: 1, rotateY: 0, x: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} style={{ perspective: 1400 }} className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="font-mono text-xs uppercase tracking-[0.3em] text-brass-dark">Chapter 01 · The radio</p><h2 className="mt-3 font-display text-5xl leading-none text-ink sm:text-7xl">A is for <em className="text-brass-dark">Alfa</em></h2></div><p className="max-w-xs font-serif text-base leading-relaxed text-ink/60">When the line is thin and the distance is wide, clarity becomes a kind of kindness.</p></div><Separator className="my-8 bg-ink/10" /><p className="max-w-3xl font-serif text-xl leading-relaxed text-ink/75">The phonetic alphabet is less a code than a shared promise: that a letter will arrive exactly as it left. Explore the deck, then try translating a phrase of your own.</p><NatoLab /></motion.article>
  const data = { number: '02', title: 'Signal & silence', kicker: 'The space between words', quote: 'A good signal does not shout. It arrives, finds its place, and stays.' }
  return <motion.article key={chapter} initial={{ opacity: 0, rotateY: -12, x: 24 }} animate={{ opacity: 1, rotateY: 0, x: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} style={{ perspective: 1400 }} className="mx-auto max-w-4xl"><p className="font-mono text-xs uppercase tracking-[0.3em] text-brass-dark">Chapter {data.number} · {data.kicker}</p><h2 className="mt-4 max-w-2xl font-display text-6xl leading-[.95] text-ink sm:text-8xl">{data.title}</h2><div className="my-10 grid gap-10 border-y border-ink/10 py-10 md:grid-cols-[.8fr_1.2fr]"><blockquote className="font-display text-3xl leading-tight text-brass-dark">“{data.quote}”</blockquote><div className="flex flex-col gap-5 font-serif text-lg leading-8 text-ink/70"><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer finibus, sapien at porttitor feugiat, lectus arcu commodo nisl, vitae fermentum urna est nec libero.</p><p>Curabitur dignissim, nibh in malesuada congue, erat mi placerat justo, sed commodo risus sapien non sapien. Suspendisse potenti. Praesent sed neque in justo posuere fermentum.</p><p>Nam vehicula, justo in vulputate tincidunt, arcu augue malesuada ante, a feugiat arcu ligula sed velit. Donec a purus sed lorem viverra posuere.</p></div></div><div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-ink/45"><Check className="size-4 text-brass-dark" /> End of chapter</div></motion.article>
}

function BookReader() {
  const [opened, setOpened] = useState(false)
  const [chapterIndex, setChapterIndex] = useState(0)
  const chapter = chapters[chapterIndex].id
  const progress = useMemo(() => Math.round((chapterIndex / (chapters.length - 1)) * 100), [chapterIndex])
  const next = () => setChapterIndex((index) => Math.min(index + 1, chapters.length - 1))
  const previous = () => setChapterIndex((index) => Math.max(index - 1, 0))

  return <main className="min-h-screen bg-paper text-ink"><header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-navy text-brass-light"><BookOpen className="size-4" /></div><span className="font-display text-xl">The Last Signal</span></div>{opened && <div className="flex items-center gap-4"><span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 sm:block">Reading progress {progress}%</span><div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/10 sm:w-32"><div className="h-full rounded-full bg-brass transition-all" style={{ width: `${progress}%` }} /></div></div>}</header><section className="px-5 pb-12 sm:px-8">{!opened ? <Cover onOpen={() => { setOpened(true); setChapterIndex(1) }} /> : <div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><nav className="flex flex-wrap gap-2" aria-label="Chapters">{chapters.slice(1).map((item, index) => <button key={item.id} onClick={() => setChapterIndex(index + 1)} className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition ${chapter === item.id ? 'bg-navy text-paper' : 'text-ink/50 hover:bg-ink/5 hover:text-ink'}`}>{item.label}</button>)}</nav><button onClick={() => setOpened(false)} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/45 hover:text-ink"><ChevronDown className="size-4 rotate-90" /> Close book</button></div><div className="min-h-[680px] rounded-[2rem] border border-ink/10 bg-[#f8f1e4] px-5 py-10 shadow-[0_20px_60px_rgba(23,37,52,.08)] sm:px-10 sm:py-14 lg:px-16"><AnimatePresence mode="wait"><Chapter chapter={chapter} /></AnimatePresence><div className="mt-16 flex items-center justify-between border-t border-ink/10 pt-6"><Button onClick={previous} disabled={chapterIndex <= 1} variant="ghost" className="gap-2 text-ink/65 hover:text-ink"><ArrowLeft data-icon="inline-start" /> Previous</Button><span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/35">{String(chapterIndex).padStart(2, '0')} / 03</span><Button onClick={next} disabled={chapterIndex >= chapters.length - 1} variant="ghost" className="gap-2 text-ink/65 hover:text-ink">Next <ArrowRight data-icon="inline-end" /></Button></div></div></div>}</section><footer className="mx-auto flex max-w-7xl items-center justify-between px-5 pb-8 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/35 sm:px-8"><span>Made for the curious</span><span>© 2024 · LS-01</span></footer></main>
}


export { toNato }
export default BookReader

