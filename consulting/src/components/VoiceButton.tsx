import { useEffect, useRef, useState } from 'react'
import {
  microphoneSupported,
  startListening,
  startRecording,
  transcribeBlobWithSarvam,
  voiceSupported,
  type RecordingSession,
} from '../lib/speech.ts'

interface Props {
  onFinal: (text: string) => void
  onInterim?: (text: string) => void
  autoStart?: boolean
  listenKey?: string
  maxListenMs?: number
  /** Prefer Saaras v3 server scribe (MediaRecorder → API). */
  preferSarvam?: boolean
}

export function VoiceButton({
  onFinal,
  onInterim,
  autoStart = false,
  listenKey,
  maxListenMs,
  preferSarvam = true,
}: Props) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [hint, setHint] = useState('')
  const [backend, setBackend] = useState<'sarvam' | 'browser' | 'idle'>('idle')
  const stopBrowserRef = useRef<(() => void) | null>(null)
  const recordingRef = useRef<RecordingSession | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastListenKey = useRef<string | null>(null)
  const browserDraftRef = useRef('')

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const stopBrowser = () => {
    stopBrowserRef.current?.()
    stopBrowserRef.current = null
  }

  const stopAll = () => {
    clearTimer()
    stopBrowser()
    setListening(false)
  }

  const startBrowser = () => {
    if (!voiceSupported()) return false
    setBackend('browser')
    setHint('')
    stopBrowser()
    setListening(true)
    browserDraftRef.current = ''
    stopBrowserRef.current = startListening(
      (text, final) => {
        if (final) {
          browserDraftRef.current = browserDraftRef.current
            ? `${browserDraftRef.current} ${text}`
            : text
          onFinal(text)
        } else onInterim?.(text)
      },
      () => setListening(false),
    )
    if (maxListenMs && maxListenMs > 0) {
      timerRef.current = setTimeout(() => stopAll(), maxListenMs)
    }
    return true
  }

  const finishSarvamRecording = async () => {
    clearTimer()
    stopBrowser()
    setListening(false)
    setProcessing(true)
    setHint('Transcribing with Sarvam Saaras…')
    try {
      const blob = await recordingRef.current?.stop()
      recordingRef.current = null
      if (blob && blob.size > 800) {
        const text = await transcribeBlobWithSarvam(blob)
        if (text.trim()) {
          onFinal(text)
          setHint('')
          return
        }
      }
      if (browserDraftRef.current.trim()) {
        onFinal(browserDraftRef.current.trim())
        setHint('')
        return
      }
      setHint('Could not transcribe audio. Try again or type your answer.')
      startBrowser()
    } catch {
      if (browserDraftRef.current.trim()) {
        onFinal(browserDraftRef.current.trim())
        setHint('')
      } else if (startBrowser()) {
        setHint('Sarvam scribe unavailable — using browser voice. Speak again.')
      } else {
        setHint('Allow microphone access or type your answer.')
      }
    } finally {
      setProcessing(false)
    }
  }

  const startSarvam = async (): Promise<boolean> => {
    if (!microphoneSupported()) return false
    const session = startRecording()
    recordingRef.current = session
    const ok = await session.ready
    if (!ok) {
      recordingRef.current = null
      return false
    }
    setBackend('sarvam')
    setListening(true)
    setHint('Recording — speak now. We transcribe with Sarvam Saaras when you stop.')

    if (voiceSupported()) {
      stopBrowserRef.current = startListening(
        (text, final) => {
          if (final) {
            browserDraftRef.current = browserDraftRef.current
              ? `${browserDraftRef.current} ${text}`
              : text
          }
          onInterim?.(text)
        },
        () => {},
      )
    }

    if (maxListenMs && maxListenMs > 0) {
      timerRef.current = setTimeout(() => void finishSarvamRecording(), maxListenMs)
    }
    return true
  }

  const start = async () => {
    setHint('')
    if (preferSarvam && microphoneSupported()) {
      const ok = await startSarvam()
      if (ok) return
    }
    if (startBrowser()) return
    setHint('Voice is not available. Type your answer instead.')
  }

  const toggle = () => {
    if (processing) return
    if (listening) {
      if (backend === 'sarvam') void finishSarvamRecording()
      else stopAll()
      return
    }
    void start()
  }

  useEffect(() => {
    if (!autoStart) return
    const key = listenKey ?? 'default'
    if (lastListenKey.current === key) return
    lastListenKey.current = key
    void start()
    return () => {
      stopAll()
      recordingRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, listenKey])

  useEffect(() => () => stopAll(), [])

  const label = processing
    ? 'Transcribing…'
    : listening
      ? 'Stop voice'
      : backend === 'sarvam'
        ? 'Answer by voice (Sarvam Saaras)'
        : 'Answer by voice'

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={processing}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
          listening ? 'bg-red-600' : 'bg-pbs-600 hover:bg-pbs-700'
        }`}
      >
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${listening ? 'animate-pulse bg-white' : 'bg-pbs-gold'}`} />
        {label}
      </button>
      {listening && maxListenMs ? (
        <p className="text-sm text-pbs-600">Up to about a minute. Tap stop when you are done.</p>
      ) : null}
      {hint && <p className="text-sm text-pbs-700">{hint}</p>}
    </div>
  )
}
