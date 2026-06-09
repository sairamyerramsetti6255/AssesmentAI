/**
 * Prototype API client — wraps all /api/proto/* calls to the Node.js server,
 * which persists data in Supabase.
 */

import { resolveApiUrl } from './apiBase'
import { normalizeDocuments } from './documents'
import type {
  Lead,
  LeadDocument,
  PlatformUser,
  AssessmentQuestion,
  MandatoryQuestion,
  MasterDataCategory,
  ActivityLogEntry,
  UserRole,
} from '../types'

// ── Auth token storage ────────────────────────────────────────────────────

const TOKEN_KEY = 'proto-auth-token'

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* ignore */ }
}

// ── Base request ─────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(resolveApiUrl(path), { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ═════════════════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════════════════

export async function login(email: string, password: string): Promise<{ token: string; user: PlatformUser }> {
  const data = await request<{ token: string; user: PlatformUser }>('/api/proto/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data
}

export async function getMe(): Promise<PlatformUser> {
  return request<PlatformUser>('/api/proto/auth/me')
}

// ═════════════════════════════════════════════════════════════════════════
// PLATFORM USERS
// ═════════════════════════════════════════════════════════════════════════

export function getUsers(): Promise<PlatformUser[]> {
  return request('/api/proto/users')
}

export function createUser(u: Omit<PlatformUser, 'id'>): Promise<PlatformUser> {
  return request('/api/proto/users', { method: 'POST', body: JSON.stringify(u) })
}

export function updateUser(id: string, patch: Partial<PlatformUser>): Promise<PlatformUser> {
  return request(`/api/proto/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
}

export function deleteUser(id: string): Promise<{ ok: boolean }> {
  return request(`/api/proto/users/${id}`, { method: 'DELETE' })
}

// ═════════════════════════════════════════════════════════════════════════
// LEADS
// ═════════════════════════════════════════════════════════════════════════

export function getLeads(): Promise<Lead[]> {
  return request('/api/proto/leads')
}

export function getLead(id: string): Promise<Lead> {
  return request(`/api/proto/leads/${id}`)
}

export function createLead(
  data: Pick<Lead, 'companyName' | 'industry' | 'domain' | 'country' | 'assignedExecutive'> & {
    documents?: string[]
    documentRecords?: LeadDocument[]
  },
): Promise<DbLead> {
  return request('/api/proto/leads', {
    method: 'POST',
    body: JSON.stringify({
      company_name: data.companyName,
      industry: data.industry,
      domain: data.domain,
      country: data.country,
      assigned_executive: data.assignedExecutive,
      documents: data.documents ?? data.documentRecords?.map((d) => d.name) ?? [],
      document_records: data.documentRecords?.map(dbFromLeadDocument),
    }),
  })
}

export async function uploadLeadDocument(
  leadId: string,
  file: File,
  meta: Pick<LeadDocument, 'matchStatus' | 'transactionDate' | 'source'>,
): Promise<{ document: Record<string, unknown>; lead: DbLead }> {
  const form = new FormData()
  form.append('file', file)
  form.append(
    'meta',
    JSON.stringify({
      match_status: meta.matchStatus,
      transaction_date: meta.transactionDate,
      source: meta.source,
    }),
  )
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(resolveApiUrl(`/api/proto/leads/${leadId}/documents`), {
    method: 'POST',
    headers,
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<{ document: Record<string, unknown>; lead: DbLead }>
}

export async function downloadLeadDocument(opts: {
  leadId?: string
  portalToken?: string
  docId: string
  filename: string
}): Promise<void> {
  const path = opts.portalToken
    ? `/api/proto/portal/${opts.portalToken}/documents/${opts.docId}/file`
    : `/api/proto/leads/${opts.leadId}/documents/${opts.docId}/file`

  const headers: Record<string, string> = {}
  const token = getToken()
  if (token && !opts.portalToken) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(resolveApiUrl(path), { headers })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opts.filename
  a.click()
  URL.revokeObjectURL(url)
}

export function updateLead(id: string, patch: Partial<DbLead>): Promise<Lead> {
  return request(`/api/proto/leads/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
}

export function deleteLead(id: string): Promise<{ ok: boolean }> {
  return request(`/api/proto/leads/${id}`, { method: 'DELETE' })
}

export function approveLead(id: string): Promise<Lead> {
  return request(`/api/proto/leads/${id}/approve`, { method: 'POST' })
}

export function saveClientResponses(
  id: string,
  answers: Record<string, unknown>,
  richtext: Record<string, string>,
  progress: number,
  extras?: {
    otherText?: Record<string, string>
    uploadedDocuments?: LeadDocument[]
  },
): Promise<DbLead> {
  return request(`/api/proto/leads/${id}/client-responses`, {
    method: 'PUT',
    body: JSON.stringify({
      answers,
      richtext,
      progress,
      other_text: extras?.otherText,
      uploaded_docs: extras?.uploadedDocuments?.map((d) => d.name),
      client_document_records: extras?.uploadedDocuments?.map(dbFromLeadDocument),
    }),
  })
}

export function addRemark(id: string, text: string): Promise<Lead> {
  return request(`/api/proto/leads/${id}/remarks`, { method: 'POST', body: JSON.stringify({ text }) })
}

export function getPortalData(token: string): Promise<{ lead: Lead; questions: AssessmentQuestion[] }> {
  return request(`/api/proto/portal/${token}`)
}

// ═════════════════════════════════════════════════════════════════════════
// QUESTIONS (per lead)
// ═════════════════════════════════════════════════════════════════════════

export function getQuestions(leadId: string): Promise<AssessmentQuestion[]> {
  return request(`/api/proto/leads/${leadId}/questions`)
}

/** Full replace — send all questions for a lead */
export function saveQuestions(leadId: string, questions: AssessmentQuestion[]): Promise<AssessmentQuestion[]> {
  return request(`/api/proto/leads/${leadId}/questions`, {
    method: 'PUT',
    body: JSON.stringify(
      questions.map((q) => ({
        id: q.id,
        sort_order: q.sortOrder,
        taxonomy_pillar: q.taxonomyPillar,
        domain_context: q.domainContext,
        category: q.category,
        text: q.text,
        type: q.type,
        options: q.options ?? [],
        suggested_options: q.suggestedOptions ?? [],
        is_mandatory: q.isMandatory ?? false,
      })),
    ),
  })
}

// ═════════════════════════════════════════════════════════════════════════
// MANDATORY QUESTIONS
// ═════════════════════════════════════════════════════════════════════════

export function getMandatoryQuestions(): Promise<MandatoryQuestion[]> {
  return request('/api/proto/mandatory-questions')
}

export function createMandatoryQuestion(text: string): Promise<MandatoryQuestion> {
  return request('/api/proto/mandatory-questions', {
    method: 'POST',
    body: JSON.stringify({ text, type: 'singlechoice', options: [] }),
  })
}

export function updateMandatoryQuestion(id: string, patch: Partial<MandatoryQuestion>): Promise<MandatoryQuestion> {
  return request(`/api/proto/mandatory-questions/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
}

export function deleteMandatoryQuestion(id: string): Promise<{ ok: boolean }> {
  return request(`/api/proto/mandatory-questions/${id}`, { method: 'DELETE' })
}

// ═════════════════════════════════════════════════════════════════════════
// MASTER DATA
// ═════════════════════════════════════════════════════════════════════════

export function getMasterData(): Promise<Record<MasterDataCategory, string[]>> {
  return request('/api/proto/master-data')
}

export function addMasterDataItem(category: MasterDataCategory, name: string): Promise<unknown> {
  return request(`/api/proto/master-data/${category}`, { method: 'POST', body: JSON.stringify({ name }) })
}

export function updateMasterDataItem(category: MasterDataCategory, oldName: string, newName: string): Promise<unknown> {
  return request(`/api/proto/master-data/${category}/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: newName }),
  })
}

export function deleteMasterDataItem(category: MasterDataCategory, name: string): Promise<{ ok: boolean }> {
  return request(`/api/proto/master-data/${category}/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

// ═════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═════════════════════════════════════════════════════════════════════════

export function getActivityLog(leadId?: string): Promise<ActivityLogEntry[]> {
  const qs = leadId ? `?lead_id=${leadId}` : ''
  return request(`/api/proto/activity-log${qs}`)
}

export function logActivity(
  kind: string,
  summary: string,
  extra?: { leadId?: string; companyName?: string; actorName?: string; actorRole?: UserRole },
): Promise<ActivityLogEntry> {
  return request('/api/proto/activity-log', {
    method: 'POST',
    body: JSON.stringify({
      kind,
      summary,
      actor_name: extra?.actorName ?? 'System',
      actor_role: extra?.actorRole ?? 'account_executive',
      lead_id: extra?.leadId,
      company_name: extra?.companyName,
    }),
  })
}

// ═════════════════════════════════════════════════════════════════════════
// DB → App type mapping helpers
// ═════════════════════════════════════════════════════════════════════════

/** Raw DB lead shape (snake_case) */
export interface DbLead {
  id: string
  company_name: string
  industry: string
  domain: string
  country: string
  assigned_executive: string
  funnel_status: string
  assessment_status: string
  portal_token?: string
  research_progress: number
  client_progress?: number
  documents: string[]
  document_records?: Array<Record<string, unknown>>
  remarks: string[]
  client_answers?: Record<string, unknown>
  client_richtext?: Record<string, string>
  client_other_text?: Record<string, string>
  client_uploaded_docs?: string[]
  client_document_records?: Array<Record<string, unknown>>
  ai_research?: Record<string, unknown>
  assessment_taxonomy?: Record<string, unknown>
  last_interaction: string
  created_at: string
  updated_at: string
}

function dbToLeadDocument(r: Record<string, unknown>): LeadDocument {
  return {
    id: String(r.id),
    name: String(r.name),
    matchStatus: (r.match_status as LeadDocument['matchStatus']) ?? 'unmatched',
    transactionDate: String(r.transaction_date ?? '').slice(0, 10),
    uploadedAt: String(r.uploaded_at ?? new Date().toISOString()),
    source: (r.source as LeadDocument['source']) ?? 'intake',
    hasFile: Boolean(r.has_file ?? r.storage_path),
  }
}

function dbFromLeadDocument(d: LeadDocument): Record<string, unknown> {
  return {
    id: d.id,
    name: d.name,
    match_status: d.matchStatus,
    transaction_date: d.transactionDate,
    uploaded_at: d.uploadedAt,
    source: d.source,
    has_file: d.hasFile ?? false,
  }
}

/** Convert DB row → app Lead */
export function dbToLead(r: DbLead): Lead {
  const documentRecords = r.document_records?.length
    ? r.document_records.map((row) => dbToLeadDocument(row))
    : normalizeDocuments(r.documents, 'intake')

  const clientRecords = r.client_document_records?.length
    ? r.client_document_records.map((row) => dbToLeadDocument(row))
    : normalizeDocuments(r.client_uploaded_docs, 'client')

  return {
    id: r.id,
    companyName: r.company_name,
    industry: r.industry,
    domain: r.domain,
    country: r.country,
    assignedExecutive: r.assigned_executive,
    funnelStatus: r.funnel_status as Lead['funnelStatus'],
    assessmentStatus: r.assessment_status as Lead['assessmentStatus'],
    portalToken: r.portal_token,
    researchProgress: r.research_progress ?? 0,
    clientProgress: r.client_progress,
    documents: documentRecords,
    remarks: r.remarks ?? [],
    clientAnswers: r.client_answers as Lead['clientAnswers'],
    clientRichtext: r.client_richtext,
    clientOtherText: r.client_other_text,
    clientUploadedDocuments: clientRecords,
    aiResearch: r.ai_research as Lead['aiResearch'],
    assessmentTaxonomy: r.assessment_taxonomy as Lead['assessmentTaxonomy'],
    lastInteraction: r.last_interaction,
    createdAt: r.created_at?.slice(0, 10) ?? '',
  }
}

/** Convert DB prototype_question row → AssessmentQuestion */
export function dbToQuestion(r: Record<string, unknown>): AssessmentQuestion {
  return {
    id: r.id as string,
    sortOrder: (r.sort_order as number) ?? 0,
    taxonomyPillar: (r.taxonomy_pillar as AssessmentQuestion['taxonomyPillar']) ?? 'Technical Pain Points',
    domainContext: (r.domain_context as string) ?? '',
    category: (r.category as AssessmentQuestion['category']) ?? 'Technology Stack',
    text: (r.text as string) ?? '',
    type: (r.type as AssessmentQuestion['type']) ?? 'singlechoice',
    options: (r.options as string[]) ?? [],
    suggestedOptions: (r.suggested_options as string[]) ?? [],
    isMandatory: (r.is_mandatory as boolean) ?? false,
  }
}

/** Convert mandatory_question DB row → MandatoryQuestion */
export function dbToMandatory(r: Record<string, unknown>): MandatoryQuestion {
  return {
    id: r.id as string,
    text: r.text as string,
    type: (r.type as MandatoryQuestion['type']) ?? 'singlechoice',
    options: (r.options as string[]) ?? [],
  }
}
