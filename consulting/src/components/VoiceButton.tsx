import { useEffect, useRef, useState } from 'react'
import { summarizeSpeechWithGemini } from '../lib/api.ts'
import {
  liveVoiceSupported,
  microphoneSupported,
  audioBlobToWav,
  speechWavChunks,
  startLiveVoice,
  startRecording,
  transcribeBlobWithSarvam,
  type RecordingSession,
} from '../lib/speech.ts'

interface Props {
  onFinal: (text: string) => void
  onInterim?: (text: string) => void
  onStopped?: (replacement?: string) => void
  onStarted?: () => void
  onReset?: () => void
  onBargeIn?: () => void
  /** When false, loud sound does not stop the question voice. */
  bargeArmed?: boolean
  autoStart?: boolean
  listenKey?: string
  maxListenMs?: number
  /** Record only. Nothing is shown while speaking, and quiet audio is dropped. */
  captureOnly?: boolean
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function VoiceButton({
  onFinal,
  onInterim,
  onStopped,
  onStarted,
  onReset,
  onBargeIn,
  bargeArmed = false,
  autoStart = false,
  listenKey,
  maxListenMs,
  captureOnly = false,
}: Props) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [leftMs, setLeftMs] = useState(maxListenMs ?? 0)
  const recordingRef = useRef<RecordingSession | null>(null)
  const stopLiveRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastListenKey = useRef<string | null>(null)
  const busyRef = useRef(false)
  const listeningRef = useRef(false)
  const generation = useRef(0)
  const startedAt = useRef(0)
  const budgetRef = useRef(maxListenMs ?? 0)
  const clockOn = useRef(false)
  const bargedRef = useRef(false)
  const bargeArmedRef = useRef(bargeArmed)
  const hotLevel = useRef(0)
  bargeArmedRef.current = bargeArmed
  const spokenParts = useRef<string[]>([])
  const latestInterim = useRef('')

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  const stopLive = () => {
    stopLiveRef.current?.()
    stopLiveRef.current = null
  }

  const pauseClock = () => {
    if (!maxListenMs || !clockOn.current) return
    const left = Math.max(0, budgetRef.current - (Date.now() - startedAt.current))
    budgetRef.current = left
    setLeftMs(left)
    clockOn.current = false
  }

  const finish = async () => {
    if (!listeningRef.current && !recordingRef.current) return
    listeningRef.current = false
    busyRef.current = true
    clearTimer()
    pauseClock()
    stopLive()
    setListening(false)
    const session = recordingRef.current
    recordingRef.current = null
    setProcessing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    const heard = [spokenParts.current.join(' '), latestInterim.current]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    spokenParts.current = []
    latestInterim.current = ''
    const token = generation.current + 1
    generation.current = token
    let replacement = heard
    try {
      if (session) {
        const { blob, speechMs } = await session.stop()
        if (captureOnly && blob && blob.size > 800) {
          const chunks = await speechWavChunks(blob)
          const clips = chunks.length ? chunks : [await audioBlobToWav(blob)].filter((clip): clip is Blob => Boolean(clip))
          const summaries: string[] = []
          for (const clip of clips) {
            const text = (await summarizeSpeechWithGemini(clip)).trim()
            if (text) summaries.push(text)
          }
          replacement = summaries.join(' ').trim() || heard
        } else if (!captureOnly && blob && speechMs >= 400 && !heard) {
          const chunks = await speechWavChunks(blob)
          const parts: string[] = []
          for (const chunk of chunks) {
            const text = (await transcribeBlobWithSarvam(chunk)).trim()
            if (text) parts.push(text)
          }
          replacement = parts.join(' ').trim()
        }
      }
    } catch {
      replacement = heard
    } finally {
      setProcessing(false)
      busyRef.current = false
      if (generation.current === token) onStopped?.(replacement || undefined)
    }
  }

  const reset = () => {
    generation.current += 1
    listeningRef.current = false
    busyRef.current = false
    clockOn.current = false
    clearTimer()
    stopLive()
    const session = recordingRef.current
    recordingRef.current = null
    void session?.stop()
    budgetRef.current = maxListenMs ?? 0
    setLeftMs(maxListenMs ?? 0)
    setListening(false)
    setProcessing(false)
    spokenParts.current = []
    latestInterim.current = ''
    onReset?.()
    void start()
  }

  const start = async () => {
    if (busyRef.current || listeningRef.current) return
    if (maxListenMs && budgetRef.current <= 0) return
    const gen = generation.current + 1
    generation.current = gen
    listeningRef.current = true
    bargedRef.current = false
    setListening(true)
    onStarted?.()
    if (!captureOnly && liveVoiceSupported()) {
      stopLive()
      stopLiveRef.current = startLiveVoice(
        (text, final) => {
          if (generation.current !== gen) return
          const english = text.replace(/[^\x00-\x7F]+/g, ' ').replace(/\s+/g, ' ').trim()
          if (!english) return
          if (captureOnly) {
            if (final) {
              spokenParts.current.push(english)
              latestInterim.current = ''
            } else {
              latestInterim.current = english
            }
          } else if (final) {
            onInterim?.('')
            onFinal(english)
          }
        },
        () => {
          /* recognition ended; the recording timer stays until Stop */
        },
      )
    }
    if (microphoneSupported()) {
      const session = startRecording((level) => {
        if (!bargeArmedRef.current || bargedRef.current) {
          hotLevel.current = 0
          return
        }
        if (level > 0.14) hotLevel.current += 1
        else hotLevel.current = 0
        if (hotLevel.current >= 2) {
          bargedRef.current = true
          onBargeIn?.()
        }
      }, captureOnly)
      recordingRef.current = session
      const ok = await session.ready
      if (generation.current !== gen) {
        if (recordingRef.current === session) recordingRef.current = null
        await session.stop()
        return
      }
      if (!ok) {
        recordingRef.current = null
        if (captureOnly || !liveVoiceSupported()) {
          listeningRef.current = false
          setListening(false)
          return
        }
      }
    } else if (!liveVoiceSupported()) {
      listeningRef.current = false
      setListening(false)
      return
    }
    if (generation.current !== gen) return
    if (maxListenMs && maxListenMs > 0) {
      startedAt.current = Date.now()
      clockOn.current = true
      setLeftMs(budgetRef.current)
      tickRef.current = setInterval(() => {
        if (generation.current !== gen) {
          clearTimer()
          return
        }
        const left = budgetRef.current - (Date.now() - startedAt.current)
        setLeftMs(Math.max(0, left))
        if (left <= 0) void finish()
      }, 200)
    }
  }

  useEffect(() => {
    if (!autoStart) return
    const key = listenKey ?? 'default'
    if (lastListenKey.current === key) return
    lastListenKey.current = key
    void start()
    return () => {
      generation.current += 1
      listeningRef.current = false
      clearTimer()
      stopLive()
      const session = recordingRef.current
      recordingRef.current = null
      void session?.stop()
      lastListenKey.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, listenKey])

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label={listening ? 'Stop microphone' : 'Start microphone'}
        onClick={() => (listeningRef.current ? void finish() : void start())}
        disabled={processing}
        className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-sm disabled:opacity-60 ${
          listening ? 'bg-red-600' : 'bg-pbs-600 hover:bg-pbs-700'
        }`}
      >
        {listening ? (
          <span className="h-4 w-4 rounded-sm bg-white" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        )}
      </button>
      {maxListenMs ? (
        <>
          <span className="text-lg font-semibold tabular-nums text-pbs-navy">{clock(leftMs)}</span>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-pbs-line px-4 py-2 text-sm font-semibold text-pbs-navy"
          >
            Reset
          </button>
        </>
      ) : null}
    </div>
  )
}
