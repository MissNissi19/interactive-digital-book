'use client'

import { AlertTriangle, Volume2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cancelSpeech, speak } from '@/lib/speech'

type Line = { role: 'pilot' | 'tower' | 'info' | 'action'; text: string }

type Scenario = {
  id: string
  label: string
  title: string
  kicker: string
  intro?: string
  lines: Line[]
  notes?: string[]
}

const roleMeta: Record<Line['role'], { label: string; className: string }> = {
  pilot: { label: 'Pilot', className: 'border-navy/15 bg-white/80 text-ink' },
  tower: { label: 'Tower', className: 'border-brass/40 bg-brass/10 text-ink' },
  info: { label: 'Info', className: 'border-brass/40 bg-brass/10 text-ink' },
  action: { label: 'Action', className: 'border-dashed border-ink/20 bg-transparent text-ink/60' },
}

function Transcript({ scenario }: { scenario: Scenario }) {
  const play = (text: string) => {
    cancelSpeech()
    speak(text)
  }

  const playAll = () => {
    cancelSpeech()
    const spoken = scenario.lines.filter((line) => line.role !== 'action')
    const chain = (index: number) => {
      if (index >= spoken.length) return
      speak(spoken[index].text, { onEnd: () => chain(index + 1) })
    }
    chain(0)
  }

  return (
    <Card id={scenario.id} className="scroll-mt-24 border-ink/10 bg-white/70 shadow-[0_14px_40px_rgba(23,37,52,0.08)]">
      <CardHeader className="border-b border-ink/10 bg-white/70 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass-dark">{scenario.kicker}</p>
            <CardTitle className="mt-2 font-display text-3xl text-ink">{scenario.title}</CardTitle>
            {scenario.intro && <CardDescription className="mt-2 max-w-2xl font-serif text-base leading-relaxed">{scenario.intro}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-brass/50 bg-brass/10 text-brass-dark">{scenario.lines.filter((line) => line.role !== 'action').length} calls</Badge>
            <Button onClick={playAll} variant="outline" size="sm" className="gap-2 border-ink/15 bg-transparent text-ink/70 hover:bg-ink/5">
              <Volume2 className="size-4" /> Play exchange
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {scenario.lines.map((line, index) => {
          const meta = roleMeta[line.role]
          if (line.role === 'action') {
            return <p key={index} className={`rounded-lg border px-4 py-3 font-serif text-sm italic ${meta.className}`}>{line.text}</p>
          }
          return (
            <div key={index} className={`group flex items-start gap-3 rounded-lg border px-4 py-3 ${meta.className}`}>
              <span className="mt-0.5 w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">{meta.label}</span>
              <p className="flex-1 font-serif text-base leading-relaxed">{line.text}</p>
              <Button onClick={() => play(line.text)} variant="ghost" size="icon" aria-label={`Listen to ${meta.label} transmission`} className="size-8 shrink-0 text-ink/35 hover:text-ink">
                <Volume2 className="size-4" />
              </Button>
            </div>
          )
        })}
        {scenario.notes && (
          <div className="mt-4 rounded-lg border border-brass/40 bg-[#fbf0d8]/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-brass-dark"><AlertTriangle className="size-4" /><span className="font-mono text-[10px] uppercase tracking-[0.2em]">Remember</span></div>
            <ul className="space-y-2 font-serif text-sm leading-relaxed text-ink/75">
              {scenario.notes.map((note) => <li key={note} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />{note}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { Line, Scenario }
export { roleMeta }
export default Transcript
