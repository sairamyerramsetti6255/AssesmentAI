import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { QuestionSpeaker } from '../components/QuestionSpeaker.tsx'
import { VoiceButton } from '../components/VoiceButton.tsx'
import { WebsiteResearchLoader, type ResearchStatusView } from '../components/WebsiteResearchLoader.tsx'
import {
  enroll,
  fetchResearchStatus,
  chooseSpokenAnswer,
  generateQuestions,
  runCompanyResearch,
  saveAnswers,
  type PublicQuestion,
} from '../lib/api.ts'
import { CLIENT_VOICE_INTRO_ID, CLIENT_VOICE_INTRO_TEXT, createIntroQuestion } from '../lib/introQuestion.ts'

type Phase = 'details' | 'story' | 'preparing' | 'questions' | 'done'

interface FormState {
  companyName: string
  industry: string
  domain: string
  contactName: string
  email: string
  phone: string
}

const BAHAMAS_INDUSTRIES = [
  'Tourism and hospitality',
  'Financial services',
  'Fishing and marine',
  'Construction and real estate',
  'Retail and wholesale',
  'Transportation and logistics',
  'Healthcare',
  'Education',
  'Government and public sector',
  'Information technology',
  'Agriculture',
  'Energy and utilities',
  'Professional services',
  'Other',
]

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

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

function matchOption(options: string[], spoken: string): string | null {
  const said = words(spoken)
  if (!said.length) return null
  let best: { option: string; score: number } | null = null
  for (const option of options) {
    const score = words(option).filter((token) => said.some((word) => word === token || word.includes(token) || token.includes(word))).length
    if (score > 0 && (!best || score > best.score)) best = { option, score }
  }
  return best?.option ?? null
}


export function Assess() {
  const [phase, setPhase] = useState<Phase>('details')
  const [form, setForm] = useState<FormState>(EMPTY)
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
  const [storyText, setStoryText] = useState('')
  const [industryPick, setIndustryPick] = useState('')
  const [customIndustry, setCustomIndustry] = useState('')
  const [barge, setBarge] = useState(0)
  const [bargeArmed, setBargeArmed] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')
  const voiceWait = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceBuf = useRef('')
  const current = questions[step]
  const spokenRef = useRef<Record<string, string>>({})
  const voiceLock = useRef(false)
  const progress = useMemo(() => {
    if (!questions.length) return 0
    return Math.round(((step + 1) / questions.length) * 100)
  }, [questions.length, step])

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resolvedIndustry = industryPick === 'Other' ? customIndustry.trim() : industryPick
  const detailsReady =
    form.companyName.trim() &&
    resolvedIndustry &&
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
      const created = await enroll({ ...form, industry: resolvedIndustry, domain: form.domain.trim() })
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
    const rest = generated.questions.filter(
      (question) => question.id !== CLIENT_VOICE_INTRO_ID && question.text !== CLIENT_VOICE_INTRO_TEXT,
    )
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
    if (!current || phase !== 'questions') return
    const question = current
    const type = normalizeType(question.type)
    voiceBuf.current = appendText(voiceBuf.current, spoken)
    if (voiceWait.current) clearTimeout(voiceWait.current)
    voiceWait.current = setTimeout(() => {
      const transcript = voiceBuf.current.trim()
      voiceBuf.current = ''
      if (transcript.length < 2) return
      void chooseSpokenAnswer({
        question: question.text,
        options: question.options ?? [],
        type,
        transcript,
      })
        .then((result) => {
          if (result.summary) setVoiceNote(result.summary)
          if (type === 'singlechoice' && result.option) {
            void continueWith(question, result.option)
            return
          }
          if (type === 'multichoice' && result.options?.length) {
            setAnswers((prev) => ({ ...prev, [question.id]: result.options as string[] }))
            return
          }
          if (type === 'scale' && result.score) {
            void continueWith(question, result.score)
            return
          }
          if (type === 'text') {
            spokenRef.current[question.id] = result.summary || transcript
            setAnswers((prev) => ({ ...prev, [question.id]: result.summary || transcript }))
          }
        })
        .catch(() => {
          const match = matchOption(question.options ?? [], transcript)
          if (type === 'singlechoice' && match) void continueWith(question, match)
        })
    }, 900)
  }

  const answered = (question: PublicQuestion): boolean => {
    const value = answers[question.id]
    const note = otherText[question.id]?.trim()
    if (note) return true
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && String(value).trim() !== ''
  }

  const persist = async (
    submitted: boolean,
    nextAnswers: Record<string, string | number | string[]> = answers,
  ) => {
    const done = questions.filter((question) => {
      const value = nextAnswers[question.id]
      const note = otherText[question.id]?.trim()
      if (note) return true
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && String(value).trim() !== ''
    }).length
    const pct = submitted ? 100 : Math.round((done / Math.max(questions.length, 1)) * 100)
    const richtext: Record<string, string> = {}
    questions.forEach((question) => {
      if (normalizeType(question.type) === 'text') {
        const value = nextAnswers[question.id]
        if (typeof value === 'string' && value.trim()) richtext[question.id] = value.trim()
      }
    })
    return saveAnswers(token, {
      answers: nextAnswers,
      richtext,
      other_text: otherText,
      progress: pct,
      submitted,
    })
  }

  const next = async () => {
    if (phase === 'story') {
      const voice = (spokenRef.current[CLIENT_VOICE_INTRO_ID] ?? '').trim()
      const notes = (otherText[CLIENT_VOICE_INTRO_ID] ?? '').trim()
      setError('')
      setBusy(true)
      try {
        const introAnswer = [voice, notes].filter(Boolean).join('\n')
        setAnswers((prev) => ({ ...prev, [CLIENT_VOICE_INTRO_ID]: introAnswer }))
        await prepareQuestions(introAnswer)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not continue')
      } finally {
        setBusy(false)
      }
      return
    }
    if (!current || !answered(current)) {
      setError('Choose an option before continuing.')
      return
    }
    setError('')
    setBusy(true)
    try {

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

  const continueWith = async (question: PublicQuestion, value: string | number | string[]) => {
    const nextAnswers = { ...answers, [question.id]: value }
    setAnswers(nextAnswers)
    setError('')
    setBusy(true)
    try {
      const last = step === questions.length - 1
      const result = await persist(last, nextAnswers)
      if (last) {
        setEmailNote(
          result.emailSent
            ? `A confirmation is on its way to ${form.email}.`
            : 'Your answers are saved. We could not send the email just now, and a consultant can still follow up.',
        )
        setPhase('done')
      } else {
        setStep((valueIndex) => valueIndex + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setVoiceNote('')
    setBargeArmed(false)
    voiceBuf.current = ''
  }, [current?.id])

  const isIntroStep = current?.id === CLIENT_VOICE_INTRO_ID
  const spokenScript = current && (phase === 'story' || phase === 'questions') ? current.text : ''

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SiteHeader cta={false} />
      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden px-5 py-3">
        {phase === 'details' && (
          <form
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault()
              if (detailsReady) void continueFromDetails()
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pbs-600">Free assessment</p>
            <h1 className="text-2xl font-semibold text-pbs-navy">Company and contact</h1>
            <Field label="Company name" value={form.companyName} onChange={(value) => setField('companyName', value)} />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-pbs-800">Industry</span>
              <select
                required
                value={industryPick}
                onChange={(event) => {
                  const value = event.target.value
                  setIndustryPick(value)
                  setField('industry', value === 'Other' ? customIndustry : value)
                }}
                className="w-full rounded-xl border border-pbs-line bg-white px-3 py-2"
              >
                <option value="">Select an industry in the Bahamas</option>
                {BAHAMAS_INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </label>
            {industryPick === 'Other' ? (
              <Field
                label="Your industry"
                value={customIndustry}
                onChange={(value) => {
                  setCustomIndustry(value)
                  setField('industry', value)
                }}
                placeholder="Type your industry"
              />
            ) : null}
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
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-pbs-line bg-white p-4">
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                {isIntroStep && <span className="rounded-full bg-pbs-50 px-2 py-1 text-pbs-700">Your story</span>}
                {!isIntroStep && current.is_mandatory && (
                  <span className="rounded-full bg-pbs-50 px-2 py-1 text-pbs-700">Required</span>
                )}
                {!isIntroStep && !current.is_mandatory && (
                  <span className="rounded-full bg-pbs-50 px-2 py-1 text-pbs-700">For your situation</span>
                )}
              </div>
              {voiceNote ? <p className="mt-2 text-sm text-pbs-700">{voiceNote}</p> : null}
              <div className="mt-3 flex items-start gap-3">
                <h1 className="flex-1 text-lg font-semibold leading-snug text-pbs-navy">{current.text}</h1>
                {spokenScript ? (
                  <QuestionSpeaker
                    script={spokenScript}
                    activeKey={current.id}
                    interruptKey={barge}
                    onPlaybackStart={() => {
                      window.setTimeout(() => setBargeArmed(true), 450)
                    }}
                  />
                ) : null}
              </div>
              {isIntroStep ? (
                <div className="mt-8">
                  <VoiceButton
                    autoStart
                    captureOnly
                    bargeArmed={bargeArmed}
                    listenKey={current.id}
                    onBargeIn={() => {
                      setBargeArmed(false)
                      setBarge((value) => value + 1)
                    }}
                    maxListenMs={60_000}
                    onFinal={() => {}}
                    onStopped={(text) => {
                      const next = (text ?? '').trim()
                      if (!next) return
                      const prev = (spokenRef.current[current.id] ?? '').trim()
                      const combined = prev ? `${prev} ${next}` : next
                      spokenRef.current[current.id] = combined
                      setStoryText(combined)
                      setError('')
                    }}
                    onReset={() => {
                      spokenRef.current[current.id] = ''
                      setStoryText('')
                    }}
                  />
                  {storyText ? (
                    <p className="mt-4 rounded-2xl bg-pbs-50 px-4 py-3 text-sm leading-6 text-pbs-navy">{storyText}</p>
                  ) : null}
                  <label className="mt-8 block">
                    <span className="text-sm font-semibold text-pbs-navy">Extra notes (optional)</span>
                    <textarea
                      rows={4}
                      value={otherText[current.id] ?? ''}
                      onChange={(event) =>
                        setOtherText((prev) => ({ ...prev, [current.id]: event.target.value }))
                      }
                      placeholder="Optional. Type anything else you want us to know."
                      className="mt-2 w-full rounded-xl border border-pbs-line px-3 py-2"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="mt-6">
                    <QuestionControl
                      question={current}
                      value={answers[current.id]}
                      note={otherText[current.id] ?? ''}
                      onChange={(value) => {
                        const type = normalizeType(current.type)
                        if (type === 'singlechoice' || type === 'scale') {
                          void continueWith(current, value)
                          return
                        }
                        if (typeof value === 'string') spokenRef.current[current.id] = value
                        setAnswers((prev) => ({ ...prev, [current.id]: value }))
                      }}
                      onNote={(value) => setOtherText((prev) => ({ ...prev, [current.id]: value }))}
                    />
                  </div>
                  <div className="mt-6">
                    <VoiceButton
                      autoStart
                      bargeArmed={bargeArmed}
                      listenKey={current.id}
                      onBargeIn={() => {
                        setBargeArmed(false)
                        setBarge((value) => value + 1)
                      }}
                      onFinal={(text) => {
                        applyVoice(text)
                      }}
                      onStarted={() => {
                        voiceLock.current = false
                      }}
                      onStopped={(replacement) => {
                        if (!current || normalizeType(current.type) !== 'text') return
                        voiceLock.current = true
                        const questionId = current.id
                        const raw = (replacement?.trim() || '').trim()
                        if (raw.length < 8) return
                        spokenRef.current[questionId] = raw
                        setAnswers((prev) => ({ ...prev, [questionId]: raw }))
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError('')
                  if (phase === 'story') {
                    setPhase('details')
                    return
                  }
                  if (step === 0) {
                    setPhase('story')
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
        className="w-full rounded-xl border border-pbs-line bg-white px-3 py-2"
      />
    </label>
  )
}

function QuestionControl({
  question,
  value,
  note,
  onChange,
  onNote: _onNote,
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
      <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
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
              className={`block w-full rounded-lg border px-3 py-1.5 text-left text-sm ${
                on ? 'border-pbs-600 bg-pbs-50' : 'border-pbs-line bg-white'
              }`}
            >
              {option}
            </button>
          )
        })}
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
