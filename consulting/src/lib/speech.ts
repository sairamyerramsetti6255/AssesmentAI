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

/** Record from microphone until stop(); returns webm/opus blob when supported. */
export function startRecording(onEnd: () => void): () => Promise<Blob | null> {
  let stream: MediaStream | null = null
  let recorder: MediaRecorder | null = null
  const chunks: Blob[] = []

  const stopAndGetBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') {
        stream?.getTracks().forEach((track) => track.stop())
        resolve(chunks.length ? new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' }) : null)
        return
      }
      const active = recorder
      recorder.onstop = () => {
        stream?.getTracks().forEach((track) => track.stop())
        resolve(chunks.length ? new Blob(chunks, { type: active.mimeType || 'audio/webm' }) : null)
        onEnd()
      }
      recorder.stop()
    })

  void navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((media) => {
      stream = media
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      recorder = new MediaRecorder(media, { mimeType: mime })
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.start(250)
    })
    .catch(() => onEnd())

  return stopAndGetBlob
}

export async function transcribeBlobWithSarvam(blob: Blob): Promise<string> {
  const result = await transcribeAudioBlob(blob, 'en-IN')
  return result.transcript
}
