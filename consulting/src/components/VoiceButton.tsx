import { useEffect, useRef, useState } from 'react'
import { fetchSarvamHealth } from '../lib/api.ts'
import { startListening, startRecording, transcribeBlobWithSarvam, voiceSupported } from '../lib/speech.ts'

interface Props {
  onFinal: (text: string) => void
  onInterim?: (text: string) => void
  autoStart?: boolean
  listenKey?: string
  maxListenMs?: number
}

let sarvamScribeOk: boolean | null = null

async function sarvamScribeAvailable(): Promise<boolean> {
  if (sarvamScribeOk !== null) return sarvamScribeOk
  try {
    const health = await fetchSarvamHealth()
    sarvamScribeOk = health.speechToText.ok
  } catch {
    sarvamScribeOk = false
  }
  return sarvamScribeOk
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
  const [unsupported, setUnsupported] = useState(false)
  const [backend, setBackend] = useState<'browser' | 'sarvam' | 'pending'>('pending')
  const stopRef = useRef<(() => void) | null>(null)
  const stopRecordRef = useRef<(() => Promise<Blob | null>) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastListenKey = useRef<string | null>(null)

  useEffect(() => {
    void sarvamScribeAvailable().then((ok) => setBackend(ok ? 'sarvam' : 'browser'))
  }, [])

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const stop = () => {
    clearTimer()
    stopRef.current?.()
    stopRef.current = null
    setListening(false)
  }

  const finishSarvamRecording = async () => {
    setListening(false)
    setProcessing(true)
    try {
      const blob = await stopRecordRef.current?.()
      stopRecordRef.current = null
      if (blob && blob.size > 0) {
        const text = await transcribeBlobWithSarvam(blob)
        if (text) onFinal(text)
      }
    } catch {
      setUnsupported(true)
    } finally {
      setProcessing(false)
    }
  }

  const start = async () => {
    const useSarvam = backend === 'sarvam' || (backend === 'pending' && await sarvamScribeAvailable())
    setBackend(useSarvam ? 'sarvam' : 'browser')

    if (useSarvam) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setUnsupported(true)
        return
      }
      setUnsupported(false)
      stop()
      setListening(true)
      stopRecordRef.current = startRecording(() => setListening(false))
      if (maxListenMs && maxListenMs > 0) {
        timerRef.current = setTimeout(() => void finishSarvamRecording(), maxListenMs)
      }
      return
    }

    if (!voiceSupported()) {
      setUnsupported(true)
      return
    }
    setUnsupported(false)
    stop()
    setListening(true)
    stopRef.current = startListening(
      (text, final) => {
        if (final) onFinal(text)
        else onInterim?.(text)
      },
      () => stop(),
    )
    if (maxListenMs && maxListenMs > 0) {
      timerRef.current = setTimeout(() => stop(), maxListenMs)
    }
  }

  const toggle = () => {
    if (processing) return
    if (listening) {
      if (backend === 'sarvam') void finishSarvamRecording()
      else stop()
      return
    }
    void start()
  }

  useEffect(() => {
    if (!autoStart || backend === 'pending') return
    const key = listenKey ?? 'default'
    if (lastListenKey.current === key) return
    lastListenKey.current = key
    void start()
    return () => {
      stop()
      stopRecordRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start tied to listenKey/backend
  }, [autoStart, listenKey, backend])

  useEffect(() => () => stop(), [])

  const label = processing
    ? 'Transcribing…'
    : listening
      ? 'Stop voice'
      : backend === 'sarvam'
        ? 'Answer by voice (Sarvam)'
        : 'Answer by voice'

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={processing || backend === 'pending'}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
          listening ? 'bg-red-600' : 'bg-pbs-600 hover:bg-pbs-700'
        }`}
      >
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${listening ? 'animate-pulse bg-white' : 'bg-pbs-gold'}`} />
        {label}
      </button>
      {listening && maxListenMs ? (
        <p className="text-sm text-pbs-600">Listening — speak for up to about a minute. Tap stop when you are done.</p>
      ) : listening ? (
        <p className="text-sm text-pbs-600">Listening…</p>
      ) : null}
      {unsupported && (
        <p className="text-sm text-pbs-700">Voice is not available in this browser. Type your answer instead.</p>
      )}
    </div>
  )
}
