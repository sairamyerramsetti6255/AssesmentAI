import { useEffect, useRef, useState } from 'react'
import { liveVoiceSupported, microphoneSupported, startLiveVoice, startRecording, transcribeBlobWithSarvam, type RecordingSession } from '../lib/speech.ts'

interface Props {
  onFinal: (text: string) => void
  onInterim?: (text: string) => void
  onStopped?: (replacement?: string) => void
  onStarted?: () => void
  autoStart?: boolean
  listenKey?: string
  maxListenMs?: number
  preferSarvam?: boolean
}

export function VoiceButton({
  onFinal,
  onInterim,
  onStopped,
  onStarted,
  autoStart = false,
  listenKey,
  maxListenMs,
}: Props) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
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
    const session = recordingRef.current
    recordingRef.current = null
    setProcessing(true)
    let replacement = ''
    try {
      if (session) {
        const blob = await session.stop()
        if (blob && blob.size >= 400) {
          replacement = (await transcribeBlobWithSarvam(blob)).trim()
        }
      }
    } catch {
      replacement = ''
    } finally {
      setProcessing(false)
      busyRef.current = false
      onStopped?.(replacement || undefined)
    }
  }

  const start = async () => {
    if (busyRef.current) return
    onStarted?.()
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
      const session = startRecording()
      recordingRef.current = session
      const ok = await session.ready
      if (!ok) {
        recordingRef.current = null
        if (!liveVoiceSupported()) {
          setListening(false)
          return
        }
      } else if (!liveVoiceSupported()) {
        setListening(true)
      }
    } else if (!liveVoiceSupported()) {
      return
    }
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

  return (
    <button
      type="button"
      aria-label={listening ? 'Stop microphone' : 'Start microphone'}
      onClick={() => (listening ? void finish() : void start())}
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
  )
}
