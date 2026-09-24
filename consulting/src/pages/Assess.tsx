import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteHeader.tsx'
import { VoiceButton } from '../components/VoiceButton.tsx'
import { WebsiteResearchLoader, type ResearchStatusView } from '../components/WebsiteResearchLoader.tsx'
import {
  enroll,
  fetchResearchStatus,
  generateQuestions,
  runCompanyResearch,
  saveAnswers,
  type PublicQuestion,
} from '../lib/api.ts'
import { CLIENT_VOICE_INTRO_ID, createIntroQuestion } from '../lib/introQuestion.ts'

type Phase = 'details' | 'story' | 'preparing' | 'questions' | 'done'

interface FormState {
  companyName: string
  industry: string
  domain: string
  contactName: string
  email: string
  phone: string
}

const EMPTY: FormState = {
  companyName: '',
  industry: '',
  domain: '',
  contactName: '',
  email: '',
  phone: '',
}

function normalizeType(type: string): 'singlechoice' | 'multichoice' | 'scale' | 'text' {
  if (type === 'multiselect' || type === 'multichoice') return 'multichoice'
  if (type === 'slider' || type === 'rating' || type === 'scale') return 'scale'
  if (type === 'richtext' || type === 'text') return 'text'
  if (type === 'singlechoice' || type === 'choice') return 'singlechoice'
  return 'text'
}

function appendText(current: string, extra: string): string {
  const next = extra.trim()
  if (!next) return current
  return current.trim() ? `${current.trim()} ${next}` : next
}

function matchOption(options: string[], spoken: string): string | null {
  const needle = spoken.toLowerCase()
  return options.find((option) => needle.includes(option.toLowerCase())) ?? null
}

function matchOptions(options: string[], spoken: string): string[] {
  const direct = options.filter((option) => spoken.toLowerCase().includes(option.toLowerCase()))
  if (direct.length) return direct
  const parts = spoken.split(/\band\b|,|;|\bor\b/i).map((part) => part.trim()).filter(Boolean)
  const picked: string[] = []
  for (const part of parts) {
    const hit =
      options.find(
        (option) =>
          part.toLowerCase().includes(option.toLowerCase()) ||
          option.toLowerCase().includes(part.toLowerCase()),
      ) ?? null
    if (hit && !picked.includes(hit)) picked.push(hit)
  }
  return picked
}

export function Assess() {
  const [phase, setPhase] = useState<Phase>('details')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState('')
  const [researchActive, setResearchActive] = useState(false)
  const [researchStatus, setResearchStatus] = useState<ResearchStatusView | null>(null)
  const [questions, setQuestions] = useState<PublicQuestion[]>([])
  const [warning, setWarning] = useState('')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({})
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [emailNote, setEmailNote] = useState('')
  const current = questions[step]
  const progress = useMemo(() => {
    if (!questions.length) return 0
    return Math.round(((step + 1) / questions.length) * 100)
  }, [questions.length, step])

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const detailsReady =
    form.companyName.trim() &&
    form.industry.trim() &&
    form.contactName.trim() &&
    form.email.trim() &&
    form.phone.trim()

  useEffect(() => {
    if (!researchActive || !token) return
    const poll = async () => {
      try {
        const status = await fetchResearchStatus(token)
        setResearchStatus({
          progress: status.done ? 78 : status.progress,
          done: false,
          message: status.done ? 'Writing your questions…' : status.message,
          phase: status.done ? 'brief' : status.phase,
          pagesCrawled: status.pagesCrawled,
          maxPages: status.maxPages,
          currentPath: status.currentPath,
        })
        if (status.done) setResearchActive(false)
      } catch {
        /* keep polling */
      }
    }
    void poll()
    const id = window.setInterval(() => void poll(), 1200)
    return () => window.clearInterval(id)
  }, [researchActive, token])

  const continueFromDetails = async () => {
    setError('')
    setBusy(true)
    try {
      const created = await enroll({ ...form, domain: form.domain.trim() })
      setToken(created.token)
      setQuestions([createIntroQuestion()])
      setStep(0)
      setAnswers({})
      setOtherText({})
      setResearchActive(false)
      setResearchStatus(null)
      setPhase('story')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the assessment')
    } finally {
      setBusy(false)
    }
  }

  const prepareQuestions = async (introAnswer: string) => {
    setError('')
    setPhase('preparing')
    setResearchActive(Boolean(form.domain.trim()))
    setResearchStatus({
      progress: 12,
      done: false,
      message: form.domain.trim()
        ? 'Reading your website…'
        : 'Writing your questions from what you told us…',
      phase: form.domain.trim() ? 'crawl' : 'brief',
    })
    if (form.domain.trim()) {
      await runCompanyResearch(token)
    }
    setResearchActive(false)
    setResearchStatus({
      progress: 88,
      done: false,
      message: 'Writing your questions…',
      phase: 'brief',
    })
    const generated = await generateQuestions(token, introAnswer)
    const rest = generated.questions.filter((question) => question.id !== CLIENT_VOICE_INTRO_ID)
    if (!rest.length) {
      throw new Error('Questions were not created. Please try again.')
    }
    setQuestions(rest)
    setWarning(generated.warning ?? '')
    setStep(0)
    setResearchStatus(null)
    setPhase('questions')
  }

  const applyVoice = (spoken: string) => {
    if (!current) return
    const type = normalizeType(current.type)
    const options = current.options ?? []
    if (type === 'singlechoice') {
      const match = matchOption(options, spoken)
      if (match) {
        setAnswers((prev) => ({ ...prev, [current.id]: match }))
        return
      }
    }
    if (type === 'multichoice') {
      const matches = matchOptions(options, spoken)
      if (matches.length) {
        setAnswers((prev) => {
          const existing = Array.isArray(prev[current.id]) ? (prev[current.id] as string[]) : []
          const merged = [...existing]
          matches.forEach((item) => {
            if (!merged.includes(item)) merged.push(item)
          })
          return { ...prev, [current.id]: merged }
        })
        return
      }
    }
    if (type === 'scale') {
      const score = spoken.match(/\b(10|[1-9])\b/)
      if (score) {
        setAnswers((prev) => ({ ...prev, [current.id]: Number(score[1]) }))
        return
      }
    }
    if (type === 'text') {
      setAnswers((prev) => ({
        ...prev,
        [current.id]: appendText(String(prev[current.id] ?? ''), spoken),
      }))
      return
    }
    setOtherText((prev) => ({ ...prev, [current.id]: appendText(prev[current.id] ?? '', spoken) }))
  }

  const answered = (question: PublicQuestion): boolean => {
    const value = answers[question.id]
    const note = otherText[question.id]?.trim()
    if (note) return true
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && String(value).trim() !== ''
  }

  const persist = async (submitted: boolean) => {
    const done = questions.filter((question) => answered(question)).length
    const pct = submitted ? 100 : Math.round((done / Math.max(questions.length, 1)) * 100)
    const richtext: Record<string, string> = {}
    questions.forEach((question) => {
      if (normalizeType(question.type) === 'text') {
        const value = answers[question.id]
        if (typeof value === 'string' && value.trim()) richtext[question.id] = value.trim()
      }
    })
    return saveAnswers(token, {
      answers,
      richtext,
      other_text: otherText,
      progress: pct,
      submitted,
    })
  }

  const next = async () => {
    if (!current || !answered(current)) {
      setError('Answer this question before continuing. You can speak or select one or more options.')
      return
    }
    setError('')
    setBusy(true)
    try {
      if (phase === 'story') {
        const introAnswer = String(answers[CLIENT_VOICE_INTRO_ID] ?? '').trim()
        if (introAnswer.length < 15) {
          setError('Speak or type a little more about yourself and your business.')
          return
        }
        await prepareQuestions(introAnswer)
        return
      }

      const last = step === questions.length - 1
      const result = await persist(last)
      if (last) {
        setEmailNote(
          result.emailSent
            ? `A confirmation is on its way to ${form.email}.`
            : 'Your answers are saved. We could not send the email just now, and a consultant can still follow up.',
        )
        setPhase('done')
      } else {
        setStep((value) => value + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue')
    } finally {
      setBusy(false)
    }
  }

  const isIntroStep = current?.id === CLIENT_VOICE_INTRO_ID

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader cta={false} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        {phase === 'details' && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (detailsReady) void continueFromDetails()
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pbs-600">Free assessment</p>
            <h1 className="text-3xl font-semibold text-pbs-navy">Company and contact</h1>
            <p className="text-pbs-700">
              After you submit, your first question is a short voice-friendly overview of your business. If you add a
              website URL, we use it to tailor the rest of the assessment.
            </p>
            <Field label="Company name" value={form.companyName} onChange={(value) => setField('companyName', value)} />
            <Field label="Industry" value={form.industry} onChange={(value) => setField('industry', value)} />
            <Field
              label="Your website URL"
              required={false}
              value={form.domain}
              onChange={(value) => setField('domain', value)}
              placeholder="https://example.com (optional)"
            />
            <Field label="Your name" value={form.contactName} onChange={(value) => setField('contactName', value)} />
            <Field label="Email" type="email" value={form.email} onChange={(value) => setField('email', value)} />
            <Field label="Phone" value={form.phone} onChange={(value) => setField('phone', value)} />
            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
            <button
              type="submit"
              disabled={!detailsReady || busy}
              className="rounded-full bg-pbs-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Starting…' : 'Start assessment'}
            </button>
          </form>
        )}

        {phase === 'preparing' && (
          <div className="space-y-6">
            <WebsiteResearchLoader
              status={
                researchStatus ?? {
                  progress: 12,
                  done: false,
                  message: 'Reading your website…',
                  phase: 'crawl',
                }
              }
              active={!error}
            />
            {error && (
              <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-pbs-line bg-white p-8 text-center">
                <p className="text-rose-800">{error}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const introAnswer = String(answers[CLIENT_VOICE_INTRO_ID] ?? '').trim()
                    setBusy(true)
                    void prepareQuestions(introAnswer)
                      .catch((err) => setError(err instanceof Error ? err.message : 'Could not continue'))
                      .finally(() => setBusy(false))
                  }}
                  className="rounded-full bg-pbs-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? 'Trying again…' : 'Try again'}
                </button>
              </div>
            )}
          </div>
        )}

        {(phase === 'story' || phase === 'questions') && current && (
          <div className="space-y-5">
            {phase === 'questions' && (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-pbs-700">
                <span>Question {step + 1} of {questions.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-pbs-100">
                <div className="h-full bg-pbs-600" style={{ width: `${Math.max(progress, 8)}%` }} />
              </div>
            </div>
            )}
            {warning && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</p>}
            <div className="rounded-3xl border border-pbs-line bg-white p-6">
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                {isIntroStep && <span className="rounded-full bg-pbs-50 px-2 py-1 text-pbs-700">Your story</span>}
                {!isIntroStep && current.is_mandatory && (
                  <span className="rounded-full bg-pbs-50 px-2 py-1 text-pbs-700">Required</span>
                )}
                {!isIntroStep && !current.is_mandatory && (
                  <span className="rounded-full bg-pbs-50 px-2 py-1 text-pbs-700">For your situation</span>
                )}
              </div>
              <h1 className="text-2xl font-semibold leading-snug text-pbs-navy">{current.text}</h1>
              <div className="mt-6">
                <QuestionControl
                  question={current}
                  value={
                    normalizeType(current.type) === 'text'
                      ? appendText(typeof answers[current.id] === 'string' ? (answers[current.id] as string) : '', interim)
                      : answers[current.id]
                  }
                  note={otherText[current.id] ?? ''}
                  onChange={(value) => {
                    setInterim('')
                    setAnswers((prev) => ({ ...prev, [current.id]: value }))
                  }}
                  onNote={(value) => setOtherText((prev) => ({ ...prev, [current.id]: value }))}
                />
              </div>
              <div className="mt-6">
                <VoiceButton
                  autoStart
                  listenKey={current.id}
                  maxListenMs={isIntroStep ? 60_000 : undefined}
                  onInterim={setInterim}
                  onFinal={(text) => {
                    setInterim('')
                    applyVoice(text)
                  }}
                />
                <p className="mt-2 text-sm text-pbs-600">
                  {phase === 'story'
                    ? 'Listening is on. Speak about yourself and your business, then tap stop.'
                    : normalizeType(current.type) === 'multichoice'
                      ? 'Say several options (e.g. “A and B”). You can also tap to select.'
                      : 'Speak an option or a longer answer. You can still edit it.'}
                </p>
              </div>
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={(phase === 'story' ? false : step === 0) || busy}
                onClick={() => {
                  setError('')
                  if (phase === 'story') {
                    setPhase('details')
                    return
                  }
                  setStep((value) => value - 1)
                }}
                className="rounded-full border border-pbs-line px-5 py-3 disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void next()}
                className="rounded-full bg-pbs-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? phase === 'story'
                    ? 'Preparing your questions…'
                    : 'Saving…'
                  : phase === 'story'
                    ? 'Continue'
                    : step === questions.length - 1
                      ? 'Submit'
                      : 'Next question'}
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="rounded-3xl border border-pbs-line bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pbs-600">Received</p>
            <h1 className="mt-2 text-3xl font-semibold text-pbs-navy">Thank you, {form.contactName.split(' ')[0]}.</h1>
            <p className="mt-4 text-pbs-700">
              We have the assessment for {form.companyName}. {emailNote}
            </p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-pbs-navy px-6 py-3 font-semibold text-white">
              Back to PBS
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-pbs-800">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-pbs-line bg-white px-3 py-2.5"
      />
    </label>
  )
}

function QuestionControl({
  question,
  value,
  note,
  onChange,
  onNote,
}: {
  question: PublicQuestion
  value: string | number | string[] | undefined
  note: string
  onChange: (value: string | number | string[]) => void
  onNote: (value: string) => void
}) {
  const type = normalizeType(question.type)
  const options = question.options ?? []

  if (type === 'scale') {
    const selected = Number(value ?? 0)
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`h-11 w-11 rounded-full border font-semibold ${
              selected === score ? 'border-pbs-600 bg-pbs-600 text-white' : 'border-pbs-line bg-white'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    )
  }

  if (type === 'singlechoice' || type === 'multichoice') {
    const selected = Array.isArray(value) ? value : value ? [String(value)] : []
    return (
      <div className="space-y-2">
        {type === 'multichoice' && (
          <p className="text-sm font-medium text-pbs-700">Select all that apply</p>
        )}
        {options.map((option) => {
          const on = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (type === 'singlechoice') onChange(option)
                else onChange(on ? selected.filter((item) => item !== option) : [...selected, option])
              }}
              className={`block w-full rounded-xl border px-4 py-3 text-left ${
                on ? 'border-pbs-600 bg-pbs-50' : 'border-pbs-line bg-white'
              }`}
            >
              {option}
            </button>
          )
        })}
        <textarea
          value={note}
          onChange={(event) => onNote(event.target.value)}
          rows={3}
          placeholder="Or add a spoken or typed note"
          className="mt-3 w-full rounded-xl border border-pbs-line px-3 py-2"
        />
      </div>
    )
  }

  return (
    <textarea
      value={typeof value === 'string' ? value : note}
      onChange={(event) => onChange(event.target.value)}
      rows={isIntroQuestion(question) ? 8 : 5}
      placeholder="Type your answer, or use the microphone"
      className="w-full rounded-xl border border-pbs-line px-3 py-2"
    />
  )
}

function isIntroQuestion(question: PublicQuestion): boolean {
  return question.id === CLIENT_VOICE_INTRO_ID
}
