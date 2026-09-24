import { transcribeAudioBlob } from './api.ts'

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function recognitionCtor(): (new () => Recognition) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

export function voiceSupported(): boolean {
  return recognitionCtor() !== null
}

export function microphoneSupported(): boolean {
  return Boolean(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia)
}

export function startListening(onText: (text: string, final: boolean) => void, onEnd: () => void): () => void {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    onEnd()
    return () => {}
  }
  const recognition = new Ctor()
  recognition.lang = 'en-IN'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.onresult = (event) => {
    let interim = ''
    let finalText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0].transcript
      if (event.results[i].isFinal) finalText += piece
      else interim += piece
    }
    if (finalText) onText(finalText.trim(), true)
    else if (interim) onText(interim.trim(), false)
  }
  recognition.onerror = () => onEnd()
  recognition.onend = () => onEnd()
  recognition.start()
  return () => {
    recognition.onend = null
    recognition.stop()
  }
}

export interface RecordingSession {
  ready: Promise<boolean>
  stop: () => Promise<Blob | null>
}

/** Record from microphone until stop(); waits for mic before recording. */
export function startRecording(): RecordingSession {
  const chunks: Blob[] = []
  let stream: MediaStream | null = null
  let recorder: MediaRecorder | null = null

  const ready = (async () => {
    if (!microphoneSupported()) return false
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'
      recorder = new MediaRecorder(stream, { mimeType: mime })
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.start(300)
      return true
    } catch {
      return false
    }
  })()

  const stop = async (): Promise<Blob | null> => {
    const ok = await ready
    if (!ok || !recorder) {
      stream?.getTracks().forEach((track) => track.stop())
      return null
    }
    if (recorder.state === 'inactive') {
      stream?.getTracks().forEach((track) => track.stop())
      return chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null
    }
    return new Promise((resolve) => {
      const active = recorder!
      active.onstop = () => {
        stream?.getTracks().forEach((track) => track.stop())
        resolve(chunks.length ? new Blob(chunks, { type: active.mimeType || 'audio/webm' }) : null)
      }
      active.stop()
    })
  }

  return { ready, stop }
}

export async function transcribeBlobWithSarvam(blob: Blob): Promise<string> {
  const result = await transcribeAudioBlob(blob, 'unknown')
  return result.transcript
}
