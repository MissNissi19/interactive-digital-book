'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { postAi } from '@/lib/ai/client'
import { useStudent } from '@/lib/student/client'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What is the difference between Roger and Wilco?',
  'How do I read back a take-off clearance?',
  'Quiz me on the phonetic alphabet',
]

/** Floating AI radio tutor for signed-in students. */
export default function TutorChat({ chapter }: { chapter?: string }) {
  const { user } = useStudent()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([])
    setError(null)
  }, [user?.id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || pending) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setPending(true)
    setError(null)
    try {
      const { reply } = await postAi<{ reply: string }>('tutor', { messages: next, chapter })
      setMessages((current) => [...current, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The tutor could not answer.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-navy px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-paper shadow-[0_12px_30px_rgba(11,24,39,.35)] transition hover:bg-navy/90"
        >
          <MessageCircle className="size-4 text-brass-light" /> Ask the tutor
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="AI radio tutor"
          className="fixed right-3 bottom-3 z-40 flex h-[min(560px,calc(100vh-24px))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-[1.5rem] border border-ink/10 bg-[#f8f1e4] text-ink shadow-[0_20px_60px_rgba(23,37,52,.3)]"
        >
          <div className="flex items-center justify-between bg-navy px-4 py-3 text-paper">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brass-light" />
              <div>
                <div className="font-display text-lg leading-tight">Radio tutor</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/50">AI · answers can be wrong</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close tutor" className="text-paper/60 hover:text-paper">
              <X className="size-5" />
            </button>
          </div>

          {!user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageCircle className="size-8 text-brass-dark" />
              <p className="font-display text-xl">Your personal radio tutor</p>
              <p className="font-serif text-sm text-ink/60">
                Sign in (top right) to ask questions about the book, practise phraseology and get quizzed.
              </p>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="font-serif text-sm text-ink/70">
                      Hi {user.fullName || user.username}! Ask me anything about radio calls, procedures or this book.
                    </p>
                    <div className="flex flex-col gap-2">
                      {SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => void send(suggestion)}
                          className="rounded-lg border border-ink/10 bg-white/70 px-3 py-2 text-left font-serif text-sm text-ink/80 transition hover:border-brass/60"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <p
                      className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 font-serif text-sm leading-relaxed ${message.role === 'user' ? 'bg-navy text-paper' : 'border border-ink/10 bg-white/80 text-ink'}`}
                    >
                      {message.content}
                    </p>
                  </div>
                ))}
                {pending && <p className="animate-pulse font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">Tutor is typing…</p>}
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void send(input)
                }}
                className="flex items-end gap-2 border-t border-ink/10 bg-white/50 p-3"
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void send(input)
                    }
                  }}
                  rows={1}
                  maxLength={1500}
                  placeholder="Ask the tutor…"
                  aria-label="Message to the tutor"
                  className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-ink/15 bg-white px-3 py-2 font-serif text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send" className="size-9 bg-navy text-paper hover:bg-navy/90">
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
