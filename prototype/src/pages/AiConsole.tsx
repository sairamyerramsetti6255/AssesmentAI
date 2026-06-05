import { useState } from 'react'
import {
  chatCompletion,
  chatCompletionStream,
  OPENROUTER_FREE_MODEL,
  OpenRouterApiError,
  reasoningDemoTurns,
} from '../lib/openrouter'
import { Badge, Button, Card, Input, PageHeader } from '../components/ui'

const DEFAULT_PROMPT = "How many r's are in the word 'strawberry'?"
const DEFAULT_FOLLOWUP = 'Are you sure? Think carefully.'

export function AiConsole() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [followUp, setFollowUp] = useState(DEFAULT_FOLLOWUP)
  const [streamOut, setStreamOut] = useState('')
  const [turn1, setTurn1] = useState('')
  const [turn2, setTurn2] = useState('')
  const [loading, setLoading] = useState<'stream' | 'reasoning' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runStream = async () => {
    setError(null)
    setStreamOut('')
    setLoading('stream')
    try {
      await chatCompletionStream(
        [{ role: 'user', content: prompt }],
        (t) => setStreamOut((prev) => prev + t),
        { reasoning: true },
      )
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Stream failed')
    } finally {
      setLoading(null)
    }
  }

  const runReasoningTurns = async () => {
    setError(null)
    setTurn1('')
    setTurn2('')
    setLoading('reasoning')
    try {
      const { first, second } = await reasoningDemoTurns(prompt, followUp)
      setTurn1(first.content ?? '(empty)')
      setTurn2(second.content ?? '(empty)')
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Reasoning flow failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="OpenRouter AI Console"
        description="Uses the official OpenAI SDK pattern via secure server routes. API key stays in .env — never sent to the browser."
        actions={<Badge tone="emerald">Model: {OPENROUTER_FREE_MODEL}</Badge>}
      />
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
          {!error.includes('OPENROUTER') && (
            <p className="mt-1 text-xs">
              Check OPENROUTER_API_KEY on the API server (Coolify env) and that the frontend can reach the API subdomain.
            </p>
          )}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Streaming (curl -N equivalent)">
          <Input
            label="User message"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button className="mt-4 w-full" onClick={runStream} disabled={loading !== null}>
            {loading === 'stream' ? 'Streaming…' : 'Stream completion'}
          </Button>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {streamOut || '—'}
          </pre>
        </Card>
        <Card title="Reasoning — two-turn flow (official script)">
          <Input
            label="First user message"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Input
            label="Follow-up message"
            className="mt-3"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
          <Button className="mt-4 w-full" onClick={runReasoningTurns} disabled={loading !== null}>
            {loading === 'reasoning' ? 'Calling OpenRouter…' : 'Run 2-turn reasoning'}
          </Button>
          <div className="mt-4 space-y-3">
            <div>
              <Badge tone="indigo">Turn 1</Badge>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{turn1 || '—'}</p>
            </div>
            <div>
              <Badge tone="emerald">Turn 2 (reasoning_details preserved)</Badge>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{turn2 || '—'}</p>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Single non-stream call" className="mt-6">
        <Button
          variant="secondary"
          onClick={async () => {
            setError(null)
            try {
              const r = await chatCompletion({
                messages: [{ role: 'user', content: prompt }],
                reasoning: true,
              })
              setTurn1(r.content ?? '')
            } catch (e) {
              setError(e instanceof OpenRouterApiError ? e.message : 'Request failed')
            }
          }}
        >
          One-shot completion with reasoning enabled
        </Button>
      </Card>
    </div>
  )
}
