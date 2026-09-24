export interface PublicQuestion {
  id: string
  text: string
  type: string
  options: string[] | null
  sort_order: number
  is_mandatory: boolean
}

import { apiUrl } from './apiBase.ts'

export interface EnrollInput {
  companyName: string
  industry: string
  domain?: string
  contactName: string
  email: string
  phone: string
  brief?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Request failed')
  }
  return body as T
}

export function enroll(input: EnrollInput) {
  return request<{ leadId: string; token: string; companyName: string }>('/api/public/enroll', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function fetchSarvamHealth() {
  return request<{
    configured: boolean
    speechToText: { ok: boolean; message: string; keyKind?: string }
    webCrawl: { ok: boolean; message: string; provider: string }
  }>('/api/public/sarvam/health')
}

export async function transcribeAudioBlob(blob: Blob, languageCode = 'en-IN') {
  const form = new FormData()
  form.append('audio', blob, 'recording.webm')
  form.append('language_code', languageCode)
  const response = await fetch(apiUrl('/api/public/sarvam/transcribe'), { method: 'POST', body: form })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Transcription failed')
  }
  return body as { transcript: string; languageCode?: string }
}

export function fetchResearchStatus(token: string) {
  return request<{
    progress: number
    done: boolean
    hasWebsite: boolean
    phase: string
    message: string
    pagesCrawled: number
    maxPages: number
    currentPath?: string
    engine?: string
  }>(`/api/public/assessment/research/${token}/status`)
}

export function runCompanyResearch(token: string) {
  return request<{ research: Record<string, unknown>; cached?: boolean }>('/api/public/assessment/research', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function generateQuestions(token: string, brief: string) {
  return request<{ questions: PublicQuestion[]; warning?: string }>('/api/public/assessment/generate', {
    method: 'POST',
    body: JSON.stringify({ token, brief }),
  })
}

export function loadAssessment(token: string) {
  return request<{
    companyName: string
    submitted: boolean
    answers: Record<string, string | number | string[]>
    richtext: Record<string, string>
    otherText: Record<string, string>
    questions: PublicQuestion[]
  }>(`/api/public/assessment/${token}`)
}

export function saveAnswers(
  token: string,
  payload: {
    answers: Record<string, string | number | string[]>
    richtext: Record<string, string>
    other_text: Record<string, string>
    progress: number
    submitted?: boolean
  },
) {
  return request<{ ok: boolean; submitted: boolean; emailSent: boolean; emailError?: string }>(
    `/api/public/assessment/${token}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
}
