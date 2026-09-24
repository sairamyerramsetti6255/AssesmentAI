import { useEffect, useRef, useState } from 'react'
import { speakAloud } from '../lib/api.ts'

interface Props {
  script: string
  activeKey: string
  interruptKey?: number
  onPlaybackStart?: () => void
}

export function QuestionSpeaker({ script, activeKey, interruptKey = 0, onPlaybackStart }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const stopRequested = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    stopRequested.current = false
    setReady(false)
    audioRef.current?.pause()
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    void speakAloud(script)
      .then((blob) => {
        if (cancelled || stopRequested.current) return
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onplaying = () => onPlaybackStart?.()
        setReady(true)
        void audio.play().then(() => {
          if (cancelled || stopRequested.current) audio.pause()
        }).catch(() => {})
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })
    return () => {
      cancelled = true
      stopRequested.current = true
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [script, activeKey])

  useEffect(() => {
    if (!interruptKey) return
    stopRequested.current = true
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
  }, [interruptKey])

  return (
    <button
      type="button"
      aria-label="Play question"
      disabled={!ready}
      onClick={() => {
        const audio = audioRef.current
        if (!audio) return
        audio.currentTime = 0
        void audio.play().catch(() => {})
      }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-pbs-line text-pbs-navy disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
      </svg>
    </button>
  )
}
