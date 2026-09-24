import { transcribeAudioBlob } from './api.ts'

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

function recognitionCtor(): (new () => Recognition) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

export function liveVoiceSupported(): boolean {
  return recognitionCtor() !== null
}

/** Streams words as they are spoken. Restarts when the browser ends a session. */
export function startLiveVoice(
  onText: (text: string, final: boolean) => void,
  onEnd: () => void,
): () => void {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    onEnd()
    return () => {}
  }
  let stopped = false
  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.onresult = (event) => {
    let interim = ''
    let finalText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0].transcript
      if (event.results[i].isFinal) finalText += `${piece} `
      else interim += piece
    }
    if (interim.trim()) onText(interim.trim(), false)
    if (finalText.trim()) onText(finalText.trim(), true)
  }
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      stopped = true
      onEnd()
    }
  }
  recognition.onend = () => {
    if (stopped) {
      onEnd()
      return
    }
    try {
      recognition.start()
    } catch {
      onEnd()
    }
  }
  try {
    recognition.start()
  } catch {
    onEnd()
  }
  return () => {
    stopped = true
    recognition.onend = null
    try {
      recognition.stop()
    } catch {
      /* already stopped */
    }
  }
}

export function microphoneSupported(): boolean {
  return Boolean(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia)
}

export interface RecordingSession {
  ready: Promise<boolean>
  /** 0–1 microphone level while recording. */
  onLevel?: (level: number) => void
  stop: () => Promise<{ blob: Blob | null; speechMs: number }>
}

/** Quiet speech and room murmur stay under this. Normal talking is above it. */
const SPEECH_RMS = 0.03

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

/** One microphone stream, recorded until stop. Do not start a second recognizer on the same mic. */
export function startRecording(onLevel?: (level: number) => void, ignoreQuiet = false): RecordingSession {
  const chunks: Blob[] = []
  let stream: MediaStream | null = null
  let recorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let levelTimer: ReturnType<typeof setInterval> | null = null
  let speechMs = 0
  let lastTick = 0

  const ready = (async () => {
    if (!microphoneSupported()) return false
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: !ignoreQuiet,
          channelCount: 1,
        },
      })
      const mime = pickMime()
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.start(250)

      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        audioContext = new Ctx()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        lastTick = performance.now()
        levelTimer = setInterval(() => {
          const now = performance.now()
          const dt = now - lastTick
          lastTick = now
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const sample = (data[i] - 128) / 128
            sum += sample * sample
          }
          const rms = Math.sqrt(sum / data.length)
          if (rms >= SPEECH_RMS) speechMs += dt
          onLevel?.(Math.min(1, rms * 4))
        }, 80)
      }
      return true
    } catch {
      stream?.getTracks().forEach((track) => track.stop())
      return false
    }
  })()

  const cleanup = () => {
    if (levelTimer) clearInterval(levelTimer)
    levelTimer = null
    void audioContext?.close()
    audioContext = null
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  const stop = async (): Promise<{ blob: Blob | null; speechMs: number }> => {
    const ok = await ready
    const heard = speechMs
    if (!ok || !recorder) {
      cleanup()
      return { blob: null, speechMs: heard }
    }
    if (recorder.state === 'inactive') {
      cleanup()
      const blob = chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null
      return { blob, speechMs: heard }
    }
    const blob = await new Promise<Blob | null>((resolve) => {
      const active = recorder!
      active.onstop = () => {
        const type = (active.mimeType || 'audio/webm').split(';')[0]
        resolve(chunks.length ? new Blob(chunks, { type }) : null)
      }
      try {
        if (active.state === 'recording') active.requestData()
      } catch {
        /* some browsers throw if requestData is unsupported */
      }
      window.setTimeout(() => {
        if (active.state !== 'inactive') active.stop()
      }, 180)
    })
    cleanup()
    return { blob, speechMs: heard }
  }

  return { ready, stop }
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

/** Drops murmur and quiet audio, then splits the rest into clips under 30 seconds. */
export async function speechWavChunks(blob: Blob): Promise<Blob[]> {
  const ctx = new AudioContext()
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer())
    const rate = audio.sampleRate
    const data = audio.getChannelData(0)
    const frame = Math.max(1, Math.floor(rate * 0.02))
    const kept: number[] = []
    let hang = 0
    for (let i = 0; i < data.length; i += frame) {
      const end = Math.min(data.length, i + frame)
      let sum = 0
      for (let j = i; j < end; j++) sum += data[j] * data[j]
      const rms = Math.sqrt(sum / (end - i))
      if (rms >= SPEECH_RMS) hang = 6
      else if (hang > 0) hang -= 1
      if (rms >= SPEECH_RMS || hang > 0) {
        for (let j = i; j < end; j++) kept.push(data[j])
      }
    }
    if (kept.length < rate * 0.7) return []
    const merged = Float32Array.from(kept)
    const maxSamples = rate * 24
    const chunks: Blob[] = []
    for (let i = 0; i < merged.length; i += maxSamples) {
      chunks.push(encodeWav(merged.subarray(i, Math.min(merged.length, i + maxSamples)), rate))
    }
    return chunks
  } catch {
    return []
  } finally {
    await ctx.close()
  }
}

/** Full clip as wav so OpenRouter can hear it. Quiet frames are kept. */
export async function audioBlobToWav(blob: Blob): Promise<Blob | null> {
  const ctx = new AudioContext()
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer())
    const rate = audio.sampleRate
    const data = audio.getChannelData(0)
    const max = Math.min(data.length, rate * 60)
    return encodeWav(data.subarray(0, max), rate)
  } catch {
    return null
  } finally {
    await ctx.close()
  }
}

export async function transcribeBlobWithSarvam(blob: Blob): Promise<string> {
  const result = await transcribeAudioBlob(blob, 'en-IN')
  return result.transcript
}
