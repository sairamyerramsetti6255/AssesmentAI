import { transcribeAudioBlob } from './api.ts'

export function microphoneSupported(): boolean {
  return Boolean(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia)
}

export interface RecordingSession {
  ready: Promise<boolean>
  /** 0–1 microphone level while recording. */
  onLevel?: (level: number) => void
  stop: () => Promise<Blob | null>
}

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

/** One microphone stream, recorded until stop. Do not start a second recognizer on the same mic. */
export function startRecording(onLevel?: (level: number) => void): RecordingSession {
  const chunks: Blob[] = []
  let stream: MediaStream | null = null
  let recorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let levelTimer: ReturnType<typeof setInterval> | null = null

  const ready = (async () => {
    if (!microphoneSupported()) return false
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
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
      if (Ctx && onLevel) {
        audioContext = new Ctx()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        levelTimer = setInterval(() => {
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const sample = (data[i] - 128) / 128
            sum += sample * sample
          }
          onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4))
        }, 120)
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

  const stop = async (): Promise<Blob | null> => {
    const ok = await ready
    if (!ok || !recorder) {
      cleanup()
      return null
    }
    if (recorder.state === 'inactive') {
      cleanup()
      return chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null
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
    return blob
  }

  return { ready, stop }
}

export async function transcribeBlobWithSarvam(blob: Blob): Promise<string> {
  const result = await transcribeAudioBlob(blob, 'unknown')
  return result.transcript
}
