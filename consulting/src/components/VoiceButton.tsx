import { useEffect, useRef, useState } from 'react'
import { liveVoiceSupported, microphoneSupported, startLiveVoice, startRecording, transcribeBlobWithSarvam, type RecordingSession } from '../lib/speech.ts'

interface Props {
  onFinal: (text: string) => void
  onInterim?: (text: string) => void
  autoStart?: boolean
  listenKey?: string
  maxListenMs?: number
  preferSarvam?: boolean
}

export function VoiceButton({
  onFinal,
  onInterim,
  autoStart = false,
  listenKey,
  maxListenMs,
}: Props) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [hint, setHint] = useState('')
  const [level, setLevel] = useState(0)
  const recordingRef = useRef<RecordingSession | null>(null)
  const stopLiveRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastListenKey = useRef<string | null>(null)
  const busyRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const stopLive = () => {
    stopLiveRef.current?.()
    stopLiveRef.current = null
  }

  const finish = async () => {
    if (busyRef.current) return
    busyRef.current = true
    clearTimer()
    stopLive()
    setListening(false)
    setLevel(0)
    const session = recordingRef.current
    recordingRef.current = null
    if (!session) {
      busyRef.current = false
      return
    }
    setProcessing(true)
    setHint('Checking the recording…')
    try {
      const blob = await session.stop()
      if (blob && blob.size >= 400) {
        const text = (await transcribeBlobWithSarvam(blob)).trim()
        if (text) onFinal(text)
      }
      setHint('')
    } catch {
      setHint('')
    } finally {
      setProcessing(false)
      busyRef.current = false
    }
  }

  const start = async () => {
    if (busyRef.current) return
    setHint('Allow the microphone if your browser asks.')
    if (liveVoiceSupported()) {
      stopLive()
      setListening(true)
      stopLiveRef.current = startLiveVoice(
        (text, final) => {
          if (final) {
            onInterim?.('')
            onFinal(text)
          } else {
            onInterim?.(text)
          }
        },
        () => setListening(false),
      )
    }
    if (microphoneSupported()) {
      const session = startRecording(setLevel)
      recordingRef.current = session
      const ok = await session.ready
      if (!ok) {
        recordingRef.current = null
        if (!liveVoiceSupported()) {
          setListening(false)
          setHint('Microphone permission was blocked. Allow it, then tap Answer by voice.')
          return
        }
      } else if (!liveVoiceSupported()) {
        setListening(true)
      }
    } else if (!liveVoiceSupported()) {
      setHint('This browser cannot use the microphone. Type your answer instead.')
      return
    }
    setHint('Listening. Your words appear as you speak.')
    if (maxListenMs && maxListenMs > 0) {
      timerRef.current = setTimeout(() => void finish(), maxListenMs)
    }
  }

  useEffect(() => {
    if (!autoStart) return
    const key = listenKey ?? 'default'
    if (lastListenKey.current === key) return
    lastListenKey.current = key
    void start()
    return () => {
      clearTimer()
      stopLive()
      void recordingRef.current?.stop()
      recordingRef.current = null
      lastListenKey.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, listenKey])

  const label = processing ? 'Transcribing…' : listening ? 'Stop voice' : 'Answer by voice'

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => (listening ? void finish() : void start())}
        disabled={processing}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
          listening ? 'bg-red-600' : 'bg-pbs-600 hover:bg-pbs-700'
        }`}
      >
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${listening ? 'animate-pulse bg-white' : 'bg-pbs-gold'}`} />
        {label}
      </button>
      {listening && (
        <div className="flex h-2 w-40 overflow-hidden rounded-full bg-pbs-100" aria-hidden>
          <div className="h-full bg-pbs-600 transition-all" style={{ width: `${Math.round(level * 100)}%` }} />
        </div>
      )}
      {listening && maxListenMs ? (
        <p className="text-sm text-pbs-600">The bar moves when we hear you. Tap stop when you are done.</p>
      ) : null}
      {hint && <p className="text-sm text-pbs-700">{hint}</p>}
    </div>
  )
}
