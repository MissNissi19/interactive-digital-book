'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ClipboardList, Clock, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScoreBar, shuffle } from '@/components/exercises-chapter'
import { cancelSpeech, primeVoices } from '@/lib/speech'

const testQuestions: { question: string; options: string[]; answer: number }[] = [
  { question: 'What does “Roger” mean on the radio?', options: ['Repeat your last message', 'I have received all of your last message', 'I will comply', 'Stand by'], answer: 1 },
  { question: 'Which word means “no” or “permission not granted”?', options: ['Negative', 'Wilco', 'Correction', 'Break'], answer: 0 },
  { question: 'What should you do before you press the PTT to transmit?', options: ['Announce “going on the air”', 'Increase the volume', 'Listen out for 5 seconds', 'Say your call sign first'], answer: 2 },
  { question: 'Rand Tower’s frequency is…', options: ['122.35', '125.6', '118.7', '124.8'], answer: 2 },
  { question: '“Wilco” means…', options: ['Will comply', 'Wait for clearance', 'Wrong — correct your call', 'With clearance'], answer: 0 },
  { question: 'When replying to a station, where does your call sign go?', options: ['At the start', 'In the middle', 'At the end', 'It is not needed'], answer: 2 },
  { question: 'A signal strength report of “5” means…', options: ['Barely readable', 'Readable now and then', 'Loud and clear', 'Out of range'], answer: 2 },
  { question: 'Leaving the Rand ATZ overhead the Silver Ball (Special Rules South), you broadcast on…', options: ['118.7', '125.6', '125.8', '122.35'], answer: 1 },
  { question: 'When flying SOLO, on which circuit leg may you do an orbit?', options: ['Base', 'Final', 'Upwind', 'Downwind only'], answer: 3 },
  { question: 'Tower asks you to orbit while you are on final. You should…', options: ['Do the orbit anyway', 'Say “Unable to comply, I will do a Go Around”', 'Land immediately', 'Broadcast your position and orbit'], answer: 1 },
  { question: 'For the standard overhead join at an uncontrolled airfield you approach at…', options: ['500 ft AGL', '1000 ft AGL', '2000 ft AGL', '5000 ft AGL'], answer: 2 },
  { question: 'You missed part of a transmission. The correct phrase is…', options: ['“Repeat please”', '“Say again”', '“Go back”', '“I did not copy”'], answer: 1 },
]

const testDurationSeconds = 8 * 60

function RadioTest() {
  const [started, setStarted] = useState(false)
  const [order, setOrder] = useState<number[]>([])
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(testDurationSeconds)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!started || finished) return
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          setFinished(true)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [started, finished])

  const start = () => {
    cancelSpeech()
    setOrder(shuffle(testQuestions.map((_, questionIndex) => questionIndex)))
    setAnswers(testQuestions.map(() => null))
    setIndex(0)
    setSecondsLeft(testDurationSeconds)
    setFinished(false)
    setStarted(true)
  }

  const questionIndex = order[index]
  const question = testQuestions[questionIndex]
  const answeredCount = answers.filter((answer) => answer !== null).length
  const score = answers.reduce<number>((total, answer, itemIndex) => total + (answer === testQuestions[order[itemIndex]]?.answer ? 1 : 0), 0)

  const choose = (option: number) => {
    setAnswers((current) => current.map((value, itemIndex) => (itemIndex === index ? option : value)))
  }

  const finish = () => {
    cancelSpeech()
    setFinished(true)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')
  const percent = answers.length ? Math.round((score / answers.length) * 100) : 0

  return (
    <Card className="border-ink/10 bg-white/70 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
      <CardHeader className="border-b border-ink/10 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-brass-dark"><ClipboardList className="size-4" /> Radio test</p>
            <CardTitle className="mt-2 font-display text-3xl text-ink">The eight-minute exam</CardTitle>
            <CardDescription className="mt-2 max-w-2xl font-serif text-base leading-relaxed">{testQuestions.length} questions from the book — phraseology, frequencies and procedures. Pass mark 70%.</CardDescription>
          </div>
          {started && !finished && (
            <div className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-sm ${secondsLeft < 60 ? 'border-red-800/40 text-red-800' : 'border-ink/15 text-ink/70'}`}>
              <Clock className="size-4" /> {minutes}:{seconds}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {!started && <Button onClick={start} className="gap-2 bg-navy text-paper hover:bg-navy/90"><ClipboardList className="size-4" /> Start the test</Button>}

        {started && !finished && question && (
          <>
            <ScoreBar done={answeredCount} total={testQuestions.length} correct={score} />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">Question {index + 1} of {testQuestions.length}</p>
            <p className="font-serif text-xl leading-relaxed text-ink">{question.question}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <button
                  key={optionIndex}
                  onClick={() => choose(optionIndex)}
                  aria-pressed={answers[index] === optionIndex}
                  className={`rounded-lg border px-4 py-3 text-left font-serif text-sm transition ${answers[index] === optionIndex ? 'border-navy bg-navy text-paper' : 'border-ink/10 bg-white/80 text-ink hover:border-brass/60'}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} variant="outline" size="sm" className="border-ink/15 bg-transparent">Back</Button>
                <Button onClick={() => setIndex((value) => Math.min(testQuestions.length - 1, value + 1))} disabled={index === testQuestions.length - 1} variant="outline" size="sm" className="border-ink/15 bg-transparent">Next</Button>
              </div>
              <Button onClick={finish} className="gap-2 bg-navy text-paper hover:bg-navy/90"><Check className="size-4" /> Submit test</Button>
            </div>
          </>
        )}

        {finished && (
          <div className="space-y-4">
            <div className="rounded-lg border border-brass/40 bg-[#fbf0d8]/70 p-5 text-center">
              <p className="font-display text-5xl text-ink">{percent}%</p>
              <p className="mt-1 font-serif text-sm text-ink/60">
                {score} of {testQuestions.length} correct · {percent >= 70 ? 'Pass — cleared for the pattern.' : 'Fail — back to the reference and retry.'}
              </p>
              <Button onClick={start} className="mt-4 gap-2 bg-navy text-paper hover:bg-navy/90"><RotateCcw className="size-4" /> Retake</Button>
            </div>
            <div className="space-y-2">
              {order.map((originalIndex, itemIndex) => {
                const item = testQuestions[originalIndex]
                const given = answers[itemIndex]
                const right = given === item.answer
                return (
                  <div key={originalIndex} className={`rounded-lg border px-4 py-3 ${right ? 'border-ink/10 bg-white/70' : 'border-red-800/30 bg-red-900/5'}`}>
                    <p className="flex items-start gap-2 font-serif text-sm text-ink">
                      {right ? <Check className="mt-0.5 size-4 shrink-0 text-brass-dark" /> : <X className="mt-0.5 size-4 shrink-0 text-red-800/70" />}
                      <span>
                        {item.question}
                        <span className="block text-ink/55">
                          {given === null ? 'Not answered' : `Your answer: ${item.options[given]}`} · Correct: <em className="text-ink">{item.options[item.answer]}</em>
                        </span>
                      </span>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TestsChapter() {
  useEffect(() => {
    primeVoices()
    return () => cancelSpeech()
  }, [])

  return (
    <motion.article
      key="tests"
      initial={{ opacity: 0, rotateY: -12, x: 24 }}
      animate={{ opacity: 1, rotateY: 0, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ perspective: 1400 }}
      className="mx-auto max-w-6xl"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brass-dark">Chapter 07 · Tests</p>
          <h2 className="mt-3 font-display text-5xl leading-none text-ink sm:text-7xl">Final <em className="text-brass-dark">approach</em></h2>
        </div>
        <p className="max-w-xs font-serif text-base leading-relaxed text-ink/60">The last call of the book: sit the exam and see if tower clears you to graduate.</p>
      </div>
      <Separator className="my-8 bg-ink/10" />
      <p className="max-w-3xl font-serif text-xl leading-relaxed text-ink/75">Everything from the drills and the reference, in one timed sitting. Finish the exercises in chapter 03 first if you have not already.</p>

      <div className="mt-8">
        <RadioTest />
      </div>
    </motion.article>
  )
}

export default TestsChapter
