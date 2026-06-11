/**
 * AppContext — Supabase-backed via Node.js /api/proto/* routes.
 * All state is fetched from and persisted to the database.
 * Falls back to in-memory for operations that fail (network errors).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ActivityKind } from '../types'
import * as api from '../lib/api'
import {
  normalizeSortOrder,
  pillarToCategory,
  stripMandatoryFromAssessment,
  syncAssessmentWithMandatory,
  newBlankQuestion,
  mandatoryOptionsFromAssessment,
} from '../lib/questions'
import { normalizeInputType } from '../lib/question-types'
import type {
  AssessmentQuestion,
  AssessmentStatus,
  AssessmentTaxonomy,
  Lead,
  ActivityLogEntry,
  MandatoryQuestion,
  MasterDataCategory,
  PlatformUser,
  UserRole,
} from '../types'
import type { ResearchResult } from '../lib/ai-services'
import { documentFromFile } from '../lib/documents'

// ── Context shape ─────────────────────────────────────────────────────────

interface AppContextValue {
  leads: Lead[]
  questions: AssessmentQuestion[]
  selectedLeadId: string | null
  setSelectedLeadId: (id: string | null) => void
  selectedLead: Lead | undefined
  loading: boolean
  addLead: (
    input: Omit<Lead, 'id' | 'remarks' | 'researchProgress' | 'assessmentStatus' | 'funnelStatus' | 'createdAt' | 'lastInteraction' | 'documents'> & {
      pendingFiles?: File[]
      documentRecords?: Lead['documents']
    },
  ) => Promise<void>
  startResearch: (leadId: string) => void
  finishResearch: (leadId: string, research: ResearchResult) => Promise<void>
  setQuestions: (questions: AssessmentQuestion[]) => Promise<void>
  addQuestion: () => void
  moveQuestionUp: (id: string) => void
  moveQuestionDown: (id: string) => void
  updateQuestion: (id: string, patch: Partial<AssessmentQuestion>) => void
  deleteQuestion: (id: string) => void
  setLeadTaxonomy: (leadId: string, taxonomy: AssessmentTaxonomy) => Promise<void>
  setAssessmentStatus: (leadId: string, status: AssessmentStatus) => Promise<void>
  addRemark: (leadId: string, text: string) => Promise<void>
  moveLeadStatus: (leadId: string, status: Lead['funnelStatus']) => Promise<void>
  saveClientResponses: (
    leadId: string,
    answers: Record<string, string | number | string[]>,
    richtext: Record<string, string>,
    progress: number,
    extras?: { otherText?: Record<string, string>; uploadedDocuments?: import('../types').LeadDocument[] },
  ) => Promise<void>
  platformUsers: PlatformUser[]
  registerPlatformUser: (user: Omit<PlatformUser, 'id'>) => Promise<void>
  masterData: Record<MasterDataCategory, string[]>
  addMasterDataItem: (category: MasterDataCategory, name: string) => Promise<void>
  updateMasterDataItem: (category: MasterDataCategory, oldName: string, newName: string) => Promise<void>
  deleteMasterDataItem: (category: MasterDataCategory, name: string) => Promise<void>
  mandatoryQuestions: MandatoryQuestion[]
  addMandatoryQuestion: (text: string) => Promise<void>
  updateMandatoryQuestion: (id: string, patch: Partial<MandatoryQuestion>) => Promise<void>
  deleteMandatoryQuestion: (id: string) => Promise<void>
  currentUser: PlatformUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (patch: { name?: string; email?: string; password?: string }) => Promise<void>
  updatePlatformUser: (id: string, patch: Partial<PlatformUser>) => Promise<void>
  deletePlatformUser: (id: string) => Promise<void>
  activityLog: ActivityLogEntry[]
  logActivity: (
    kind: ActivityKind,
    summary: string,
    extra?: { leadId?: string; companyName?: string; actorName?: string; actorRole?: UserRole },
  ) => Promise<void>
  refreshLeads: () => Promise<void>
  refreshQuestions: (leadId: string) => Promise<void>
  saveProposal: (
    leadId: string,
    useCases: import('../types').UseCase[],
    architecture: Lead['proposalArchitecture'],
  ) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

// ── Default empty master data ─────────────────────────────────────────────

const EMPTY_MASTER: Record<MasterDataCategory, string[]> = {
  industries: [],
  drivers: [],
  solutions: [],
  painPoints: [],
  maturityStages: [],
}

// ── Provider ──────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [questions, setQuestionsState] = useState<AssessmentQuestion[]>([])
  const [mandatoryQuestions, setMandatoryQuestions] = useState<MandatoryQuestion[]>([])
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([])
  const [masterData, setMasterData] = useState<Record<MasterDataCategory, string[]>>(EMPTY_MASTER)
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(null)
  const [loading, setLoading] = useState(true)

  const selectedLead = leads.find((l) => l.id === selectedLeadId)

  // ── Bootstrap on mount ─────────────────────────────────────────────────

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([
          fetchLeads(),
          fetchMandatory(),
          fetchMasterData(),
          fetchUsers(),
          fetchActivityLog(),
        ])
        // Restore session
        const token = api.getToken()
        if (token) {
          try {
            const me = await api.getMe()
            setCurrentUser(me)
          } catch { api.setToken(null) }
        }
      } catch (e) {
        console.error('[AppContext] bootstrap failed:', e)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch helpers ──────────────────────────────────────────────────────

  async function fetchLeads() {
    const raw = await api.getLeads() as unknown as api.DbLead[]
    setLeads(raw.map(api.dbToLead))
    if (raw.length > 0) {
      setSelectedLeadId((prev) => prev ?? raw[0].id)
    }
  }

  async function fetchQuestions(leadId: string) {
    const raw = await api.getQuestions(leadId) as unknown as Record<string, unknown>[]
    const mqs = await api.getMandatoryQuestions() as unknown as Record<string, unknown>[]
    const mapped = raw.map(api.dbToQuestion)
    const synced = syncAssessmentWithMandatory(mapped, mqs.map(api.dbToMandatory))
    setQuestionsState(synced)
  }

  async function fetchMandatory() {
    const raw = await api.getMandatoryQuestions() as unknown as Record<string, unknown>[]
    setMandatoryQuestions(raw.map(api.dbToMandatory))
  }

  async function fetchMasterData() {
    const raw = await api.getMasterData()
    setMasterData({ ...EMPTY_MASTER, ...raw })
  }

  async function fetchUsers() {
    const raw = await api.getUsers()
    setPlatformUsers(raw)
  }

  async function fetchActivityLog() {
    const raw = await api.getActivityLog()
    setActivityLog(raw)
  }

  const refreshLeads = useCallback(async () => { await fetchLeads() }, [])
  const refreshQuestions = useCallback(async (leadId: string) => { await fetchQuestions(leadId) }, [])

  const saveProposal = useCallback(async (
    leadId: string,
    useCases: import('../types').UseCase[],
    architecture: Lead['proposalArchitecture'],
  ) => {
    if (!architecture) return
    const lead = await api.saveProposal(leadId, useCases, architecture)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? lead : l)))
  }, [])

  // Update questions when selected lead changes
  useEffect(() => {
    if (selectedLeadId) fetchQuestions(selectedLeadId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId])

  // ── Activity helper ────────────────────────────────────────────────────

  const doLogActivity = useCallback(async (
    kind: ActivityKind,
    summary: string,
    extra?: { leadId?: string; companyName?: string; actorName?: string; actorRole?: UserRole },
  ) => {
    try {
      const entry = await api.logActivity(kind, summary, {
        ...extra,
        actorName: extra?.actorName ?? currentUser?.name ?? 'System',
        actorRole: extra?.actorRole ?? (currentUser?.role as UserRole) ?? 'account_executive',
      })
      setActivityLog((prev) => [entry, ...prev].slice(0, 200))
    } catch { /* activity log is non-critical */ }
  }, [currentUser])

  // ── Persist questions ──────────────────────────────────────────────────

  const persistQuestions = useCallback(async (leadId: string, qs: AssessmentQuestion[]) => {
    try {
      await api.saveQuestions(leadId, qs)
    } catch (e) {
      console.error('[AppContext] saveQuestions failed:', e)
    }
  }, [])

  // ── AUTH ───────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { user } = await api.login(email, password)
      setCurrentUser(user)
      await doLogActivity('user.login', `${user.name} signed in`)
      return true
    } catch { return false }
  }, [doLogActivity])

  const logout = useCallback(() => {
    if (currentUser) {
      void doLogActivity('user.logout', `${currentUser.name} signed out`)
    }
    api.setToken(null)
    setCurrentUser(null)
  }, [currentUser, doLogActivity])

  const updateProfile = useCallback(async (patch: { name?: string; email?: string; password?: string }) => {
    if (!currentUser) return
    const updated = await api.updateUser(currentUser.id, patch)
    setCurrentUser(updated)
    setPlatformUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
    await doLogActivity('user.update', 'Profile updated')
  }, [currentUser, doLogActivity])

  // ── LEADS ──────────────────────────────────────────────────────────────

  const addLead = useCallback(async (
    input: Omit<Lead, 'id' | 'remarks' | 'researchProgress' | 'assessmentStatus' | 'funnelStatus' | 'createdAt' | 'lastInteraction' | 'documents'> & {
      pendingFiles?: File[]
      documentRecords?: Lead['documents']
    },
  ) => {
    const raw = await api.createLead({
      companyName: input.companyName,
      industry: input.industry,
      domain: input.domain,
      country: input.country,
      assignedExecutive: input.assignedExecutive,
      documentRecords: input.documentRecords,
    })
    let lead = api.dbToLead(raw as unknown as api.DbLead)

    if (input.pendingFiles?.length) {
      for (const file of input.pendingFiles) {
        const meta = documentFromFile(file, 'intake')
        const uploaded = await api.uploadLeadDocument(lead.id, file, meta)
        lead = api.dbToLead(uploaded.lead as unknown as api.DbLead)
      }
    }

    setLeads((prev) => [lead, ...prev])
    setSelectedLeadId(lead.id)
  }, [])

  const startResearch = useCallback((leadId: string) => {
    setLeads((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, funnelStatus: 'research' as const, researchProgress: 10 } : l),
    )
    void api.updateLead(leadId, { funnel_status: 'research', research_progress: 10 })
  }, [])

  const finishResearch = useCallback(async (leadId: string, research: ResearchResult) => {
    const patch = {
      research_progress: 100,
      funnel_status: 'review',
      ai_research: research as unknown as Record<string, unknown>,
      last_interaction: new Date().toISOString().slice(0, 10),
    }
    const raw = await api.updateLead(leadId, patch)
    const lead = api.dbToLead(raw as unknown as api.DbLead)
    setLeads((prev) => prev.map((l) => l.id === leadId ? lead : l))
  }, [])

  const setLeadTaxonomy = useCallback(async (leadId: string, taxonomy: AssessmentTaxonomy) => {
    const raw = await api.updateLead(leadId, { assessment_taxonomy: taxonomy as unknown as Record<string, unknown> })
    const lead = api.dbToLead(raw as unknown as api.DbLead)
    setLeads((prev) => prev.map((l) => l.id === leadId ? lead : l))
  }, [])

  const setAssessmentStatus = useCallback(async (leadId: string, status: AssessmentStatus) => {
    let raw: Lead
    if (status === 'approved') {
      raw = api.dbToLead((await api.approveLead(leadId)) as unknown as api.DbLead)
    } else {
      raw = api.dbToLead((await api.updateLead(leadId, { assessment_status: status })) as unknown as api.DbLead)
    }
    setLeads((prev) => prev.map((l) => l.id === leadId ? raw : l))
    if (status === 'approved') {
      const lead = leads.find((l) => l.id === leadId)
      await doLogActivity('assessment.approve', `Assessment approved for ${lead?.companyName}`, {
        leadId, companyName: lead?.companyName,
      })
    }
  }, [leads, doLogActivity])

  const addRemark = useCallback(async (leadId: string, text: string) => {
    if (!text.trim()) return
    const raw = await api.addRemark(leadId, text)
    const lead = api.dbToLead(raw as unknown as api.DbLead)
    setLeads((prev) => prev.map((l) => l.id === leadId ? lead : l))
  }, [])

  const moveLeadStatus = useCallback(async (leadId: string, status: Lead['funnelStatus']) => {
    const raw = await api.updateLead(leadId, { funnel_status: status })
    const lead = api.dbToLead(raw as unknown as api.DbLead)
    setLeads((prev) => prev.map((l) => l.id === leadId ? lead : l))
  }, [])

  const saveClientResponses = useCallback(async (
    leadId: string,
    answers: Record<string, string | number | string[]>,
    richtext: Record<string, string>,
    progress: number,
    extras?: { otherText?: Record<string, string>; uploadedDocuments?: import('../types').LeadDocument[] },
  ) => {
    const raw = await api.saveClientResponses(leadId, answers, richtext, progress, extras)
    const lead = api.dbToLead(raw as unknown as api.DbLead)
    setLeads((prev) => prev.map((l) => l.id === leadId ? lead : l))
  }, [])

  // ── QUESTIONS ──────────────────────────────────────────────────────────

  const setQuestionsAndPersist = useCallback(async (qs: AssessmentQuestion[]) => {
    const synced = syncAssessmentWithMandatory(qs, mandatoryQuestions)
    setQuestionsState(synced)
    if (selectedLeadId) await persistQuestions(selectedLeadId, synced)
  }, [mandatoryQuestions, selectedLeadId, persistQuestions])

  const addQuestion = useCallback(() => {
    setQuestionsState((prev) => {
      const optional = stripMandatoryFromAssessment(prev, mandatoryQuestions)
      const next = syncAssessmentWithMandatory([...optional, newBlankQuestion(optional.length)], mandatoryQuestions)
      if (selectedLeadId) void persistQuestions(selectedLeadId, next)
      return next
    })
  }, [mandatoryQuestions, selectedLeadId, persistQuestions])

  const moveQuestionUp = useCallback((id: string) => {
    setQuestionsState((prev) => {
      const sorted = normalizeSortOrder(prev)
      const idx = sorted.findIndex((q) => q.id === id)
      const q = sorted[idx]
      if (idx <= 0 || !q || q.isMandatory) return sorted
      const mandatoryCount = mandatoryQuestions.length
      if (idx <= mandatoryCount) return sorted
      const next = [...sorted]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      const synced = syncAssessmentWithMandatory(normalizeSortOrder(next), mandatoryQuestions)
      if (selectedLeadId) void persistQuestions(selectedLeadId, synced)
      return synced
    })
  }, [mandatoryQuestions, selectedLeadId, persistQuestions])

  const moveQuestionDown = useCallback((id: string) => {
    setQuestionsState((prev) => {
      const sorted = normalizeSortOrder(prev)
      const idx = sorted.findIndex((q) => q.id === id)
      const q = sorted[idx]
      if (idx < 0 || idx >= sorted.length - 1 || !q || q.isMandatory) return sorted
      const next = [...sorted]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      const synced = syncAssessmentWithMandatory(normalizeSortOrder(next), mandatoryQuestions)
      if (selectedLeadId) void persistQuestions(selectedLeadId, synced)
      return synced
    })
  }, [mandatoryQuestions, selectedLeadId, persistQuestions])

  const updateQuestion = useCallback((id: string, patch: Partial<AssessmentQuestion>) => {
    if (mandatoryQuestions.some((m) => m.id === id)) {
      // Mandatory question edit — update in DB too
      const type = patch.type ? (normalizeInputType(patch.type) as MandatoryQuestion['type']) : undefined
      const mPatch: Partial<MandatoryQuestion> = {}
      if (patch.text) mPatch.text = patch.text
      if (type) mPatch.type = type
      if (patch.options) mPatch.options = mandatoryOptionsFromAssessment(patch.options)
      void api.updateMandatoryQuestion(id, mPatch).then(() => fetchMandatory())
      setQuestionsState((prev) => syncAssessmentWithMandatory(
        normalizeSortOrder(prev.map((q) => {
          if (q.id !== id) return q
          const merged = { ...q, ...patch }
          if (patch.taxonomyPillar) merged.category = pillarToCategory(patch.taxonomyPillar)
          return merged
        })),
        mandatoryQuestions,
      ))
      return
    }

    setQuestionsState((prev) => {
      const synced = syncAssessmentWithMandatory(
        normalizeSortOrder(
          prev.map((q) => {
            if (q.id !== id) return q
            const merged = { ...q, ...patch }
            if (patch.taxonomyPillar) merged.category = pillarToCategory(patch.taxonomyPillar)
            return merged
          }),
        ),
        mandatoryQuestions,
      )
      if (selectedLeadId) void persistQuestions(selectedLeadId, synced)
      return synced
    })
  }, [mandatoryQuestions, selectedLeadId, persistQuestions])

  const deleteQuestion = useCallback((id: string) => {
    if (mandatoryQuestions.some((m) => m.id === id)) return
    setQuestionsState((prev) => {
      const synced = syncAssessmentWithMandatory(
        normalizeSortOrder(prev.filter((q) => q.id !== id)),
        mandatoryQuestions,
      )
      if (selectedLeadId) void persistQuestions(selectedLeadId, synced)
      return synced
    })
  }, [mandatoryQuestions, selectedLeadId, persistQuestions])

  // ── PLATFORM USERS ─────────────────────────────────────────────────────

  const registerPlatformUser = useCallback(async (user: Omit<PlatformUser, 'id'>) => {
    const created = await api.createUser(user)
    setPlatformUsers((prev) => [...prev, created])
    await doLogActivity('user.register', `New user registered: ${user.name}`)
  }, [doLogActivity])

  const updatePlatformUser = useCallback(async (id: string, patch: Partial<PlatformUser>) => {
    const updated = await api.updateUser(id, patch)
    setPlatformUsers((prev) => prev.map((u) => u.id === id ? updated : u))
    await doLogActivity('user.update', `User account updated (${patch.name ?? id})`)
  }, [doLogActivity])

  const deletePlatformUser = useCallback(async (id: string) => {
    if (id === currentUser?.id) return
    const removed = platformUsers.find((u) => u.id === id)
    await api.deleteUser(id)
    setPlatformUsers((prev) => prev.filter((u) => u.id !== id))
    if (removed) await doLogActivity('user.delete', `User removed: ${removed.name}`)
  }, [currentUser?.id, platformUsers, doLogActivity])

  // ── MASTER DATA ────────────────────────────────────────────────────────

  const addMasterDataItem = useCallback(async (category: MasterDataCategory, name: string) => {
    await api.addMasterDataItem(category, name)
    setMasterData((prev) => ({ ...prev, [category]: [...(prev[category] ?? []), name] }))
  }, [])

  const updateMasterDataItem = useCallback(async (category: MasterDataCategory, oldName: string, newName: string) => {
    await api.updateMasterDataItem(category, oldName, newName)
    setMasterData((prev) => ({
      ...prev,
      [category]: prev[category].map((x) => x === oldName ? newName : x),
    }))
  }, [])

  const deleteMasterDataItem = useCallback(async (category: MasterDataCategory, name: string) => {
    await api.deleteMasterDataItem(category, name)
    setMasterData((prev) => ({ ...prev, [category]: prev[category].filter((x) => x !== name) }))
  }, [])

  // ── MANDATORY QUESTIONS ────────────────────────────────────────────────

  const addMandatoryQuestion = useCallback(async (text: string) => {
    const created = await api.createMandatoryQuestion(text)
    const mq = api.dbToMandatory(created as unknown as Record<string, unknown>)
    setMandatoryQuestions((prev) => [...prev, mq])
    setQuestionsState((prev) => syncAssessmentWithMandatory(prev, [...mandatoryQuestions, mq]))
  }, [mandatoryQuestions])

  const updateMandatoryQuestion = useCallback(async (id: string, patch: Partial<MandatoryQuestion>) => {
    const updated = await api.updateMandatoryQuestion(id, patch)
    const mq = api.dbToMandatory(updated as unknown as Record<string, unknown>)
    setMandatoryQuestions((prev) => prev.map((q) => q.id === id ? mq : q))
    const next = mandatoryQuestions.map((q) => q.id === id ? mq : q)
    setQuestionsState((prev) => syncAssessmentWithMandatory(prev, next))
  }, [mandatoryQuestions])

  const deleteMandatoryQuestion = useCallback(async (id: string) => {
    await api.deleteMandatoryQuestion(id)
    const next = mandatoryQuestions.filter((q) => q.id !== id)
    setMandatoryQuestions(next)
    setQuestionsState((prev) => syncAssessmentWithMandatory(prev, next))
  }, [mandatoryQuestions])

  // ── Value ──────────────────────────────────────────────────────────────

  const value = useMemo<AppContextValue>(
    () => ({
      leads,
      questions,
      selectedLeadId,
      setSelectedLeadId,
      selectedLead,
      loading,
      addLead,
      startResearch,
      finishResearch,
      setQuestions: setQuestionsAndPersist,
      addQuestion,
      moveQuestionUp,
      moveQuestionDown,
      updateQuestion,
      deleteQuestion,
      setLeadTaxonomy,
      setAssessmentStatus,
      addRemark,
      moveLeadStatus,
      saveClientResponses,
      platformUsers,
      registerPlatformUser,
      masterData,
      addMasterDataItem,
      updateMasterDataItem,
      deleteMasterDataItem,
      mandatoryQuestions,
      addMandatoryQuestion,
      updateMandatoryQuestion,
      deleteMandatoryQuestion,
      currentUser,
      login,
      logout,
      updateProfile,
      updatePlatformUser,
      deletePlatformUser,
      activityLog,
      logActivity: doLogActivity,
      refreshLeads,
      refreshQuestions,
      saveProposal,
    }),
    [
      leads, questions, selectedLeadId, selectedLead, loading,
      addLead, startResearch, finishResearch, setQuestionsAndPersist,
      addQuestion, moveQuestionUp, moveQuestionDown, updateQuestion, deleteQuestion,
      setLeadTaxonomy, setAssessmentStatus, addRemark, moveLeadStatus, saveClientResponses,
      platformUsers, registerPlatformUser,
      masterData, addMasterDataItem, updateMasterDataItem, deleteMasterDataItem,
      mandatoryQuestions, addMandatoryQuestion, updateMandatoryQuestion, deleteMandatoryQuestion,
      currentUser, login, logout, updateProfile, updatePlatformUser, deletePlatformUser,
      activityLog, doLogActivity, refreshLeads, refreshQuestions, saveProposal,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
