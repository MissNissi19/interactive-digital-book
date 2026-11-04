/**
 * Server-only AI client with automatic fallback between free providers:
 * Gemini → Groq → OpenRouter. All three expose an OpenAI-compatible
 * chat-completions endpoint; providers without an API key are skipped.
 *
 * Env (.env.local):
 *   GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY
 *   GEMINI_MODEL, GROQ_MODEL, OPENROUTER_MODEL   – optional model overrides
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface Provider {
  name: string
  url: string
  key: string | undefined
  model: string
  headers?: Record<string, string>
  extra?: Record<string, unknown>
}

const PROVIDER_TIMEOUT_MS = 15_000
const TOTAL_DEADLINE_MS = 40_000

function providers(): Provider[] {
  const list: Provider[] = [
    {
      name: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      // Thinking would eat the token budget of short answers.
      extra: { reasoning_effort: 'none' },
    },
    {
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    },
    {
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
      headers: { 'HTTP-Referer': 'https://interactive-digital-book.netlify.app', 'X-Title': 'Interactive Digital Book' },
    },
  ]
  return list.filter((provider) => Boolean(provider.key))
}

export const isAiConfigured = () => providers().length > 0

export class AiUnavailableError extends Error {}

export async function generateText(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number; json?: boolean } = {},
): Promise<{ text: string; provider: string }> {
  const list = providers()
  if (list.length === 0) throw new AiUnavailableError('The AI assistant is not configured yet.')

  const startedAt = Date.now()
  const failures: string[] = []
  for (const provider of list) {
    const remaining = TOTAL_DEADLINE_MS - (Date.now() - startedAt)
    if (remaining < 2_000) break
    try {
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.key}`,
          ...provider.headers,
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          max_tokens: options.maxTokens ?? 700,
          temperature: options.temperature ?? 0.4,
          ...(options.json ? { response_format: { type: 'json_object' } } : {}),
          ...provider.extra,
        }),
        signal: AbortSignal.timeout(Math.min(PROVIDER_TIMEOUT_MS, remaining)),
        cache: 'no-store',
      })
      if (!res.ok) {
        failures.push(`${provider.name}: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`)
        continue
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] }
      const text = data.choices?.[0]?.message?.content?.trim()
      if (!text) {
        failures.push(`${provider.name}: empty response`)
        continue
      }
      return { text, provider: provider.name }
    } catch (error) {
      failures.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.error('[ai] all providers failed:', failures.join(' | '))
  throw new AiUnavailableError('The AI assistant is busy right now. Please try again in a minute.')
}

/** Parses a JSON object from a model reply, tolerating ```json fences or text around it. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const value = JSON.parse(text.slice(start, end + 1))
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}
