import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ActivityKind } from '../types'
import {
  initialMandatoryQuestions,
  initialMasterData,
  initialPlatformUsers,
} from '../data/admin-master-data'
import { generatedQuestions, initialLeads } from '../data/mock'
import type { ResearchResult } from '../lib/ai-services'
import {
  mandatoryOptionsFromAssessment,
  newBlankQuestion,
  normalizeSortOrder,
  pillarToCategory,
  stripMandatoryFromAssessment,
  syncAssessmentWithMandatory,
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

const SESSION_USER_KEY = 'ai-readiness-user-id'

function readStoredUserId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_USER_KEY)
  } catch {
    return null
  }
}

const initialActivityLog: ActivityLogEntry[] = [
  {
    id: 'log-1',
    at: '2026-06-04T08:15:00',
    kind: 'user.login',
    actorName: 'Elena Vasquez',
    actorRole: 'super_admin',
    summary: 'Super Admin signed in',
  },
  {
    id: 'log-2',
    at: '2026-06-04T09:20:00',
    kind: 'client.portal_save',
    actorName: 'Pacific Retail (client)',
    actorRole: 'account_executive',
    summary: 'Assessment progress saved — 45%',
    leadId: 'lead-2',
    companyName: 'Pacific Retail Group',
  },
  {
    id: 'log-3',
    at: '2026-06-03T14:00:00',
    kind: 'assessment.approve',
    actorName: 'Marcus Webb',
    actorRole: 'team_lead',
    summary: 'Assessment approved — portal link issued',
    leadId: 'lead-2',
    companyName: 'Pacific Retail Group',
  },
]

interface AppContextValue {
  leads: Lead[]
  questions: AssessmentQuestion[]
  selectedLeadId: string | null
  setSelectedLeadId: (id: string | null) => void
  selectedLead: Lead | undefined
  addLead: (lead: Omit<Lead, 'id' | 'remarks' | 'researchProgress' | 'assessmentStatus' | 'funnelStatus' | 'createdAt' | 'lastInteraction' | 'documents'> & { documents?: string[] }) => void
  startResearch: (leadId: string) => void
  finishResearch: (leadId: string, research: ResearchResult) => void
  setQuestions: (questions: AssessmentQuestion[]) => void
  addQuestion: () => void
  moveQuestionUp: (id: string) => void
  moveQuestionDown: (id: string) => void
  updateQuestion: (id: string, patch: Partial<AssessmentQuestion>) => void
  deleteQuestion: (id: string) => void
  setLeadTaxonomy: (leadId: string, taxonomy: AssessmentTaxonomy) => void
  setAssessmentStatus: (leadId: string, status: AssessmentStatus) => void
  addRemark: (leadId: string, text: string) => void
  moveLeadStatus: (leadId: string, status: Lead['funnelStatus']) => void
  saveClientResponses: (
    leadId: string,
    answers: Record<string, string | number | string[]>,
    richtext: Record<string, string>,
    progress: number,
    extras?: {
      otherText?: Record<string, string>
      uploadedDocuments?: string[]
    },
  ) => void
  platformUsers: PlatformUser[]
  registerPlatformUser: (user: Omit<PlatformUser, 'id'>) => void
  masterData: Record<MasterDataCategory, string[]>
  addMasterDataItem: (category: MasterDataCategory, name: string) => void
  updateMasterDataItem: (category: MasterDataCategory, oldName: string, newName: string) => void
  deleteMasterDataItem: (category: MasterDataCategory, name: string) => void
  mandatoryQuestions: MandatoryQuestion[]
  addMandatoryQuestion: (text: string) => void
  updateMandatoryQuestion: (id: string, patch: Partial<MandatoryQuestion>) => void
  deleteMandatoryQuestion: (id: string) => void
  currentUser: PlatformUser | null
  login: (email: string, password: string) => boolean
  logout: () => void
  updateProfile: (patch: { name?: string; email?: string; password?: string }) => void
  updatePlatformUser: (id: string, patch: Partial<PlatformUser>) => void
  deletePlatformUser: (id: string) => void
  activityLog: ActivityLogEntry[]
  logActivity: (
    kind: ActivityKind,
    summary: string,
    extra?: { leadId?: string; companyName?: string; actorName?: string; actorRole?: UserRole },
  ) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [mandatoryQuestions, setMandatoryQuestions] = useState<MandatoryQuestion[]>(
    initialMandatoryQuestions,
  )
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(() =>
    syncAssessmentWithMandatory(generatedQuestions, initialMandatoryQuestions),
  )
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>('lead-1')
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>(initialPlatformUsers)
  const [masterData, setMasterData] =
    useState<Record<MasterDataCategory, string[]>>(initialMasterData)
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readStoredUserId())
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog)

  const currentUser = platformUsers.find((u) => u.id === currentUserId) ?? null
  const selectedLead = leads.find((l) => l.id === selectedLeadId)

  const logActivity = useCallback(
    (
      kind: ActivityKind,
      summary: string,
      extra?: { leadId?: string; companyName?: string; actorName?: string; actorRole?: UserRole },
    ) => {
      const actor = currentUser
      const entry: ActivityLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
        kind,
        actorName: extra?.actorName ?? actor?.name ?? 'System',
        actorRole: extra?.actorRole ?? actor?.role ?? 'account_executive',
        summary,
        leadId: extra?.leadId,
        companyName: extra?.companyName,
      }
      setActivityLog((prev) => [entry, ...prev].slice(0, 200))
    },
    [currentUser],
  )

  const login = useCallback((email: string, password: string): boolean => {
    const user = platformUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    )
    if (!user) return false
    const now = new Date().toISOString()
    setPlatformUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, lastLogin: now } : u)),
    )
    setCurrentUserId(user.id)
    try {
      sessionStorage.setItem(SESSION_USER_KEY, user.id)
    } catch {
      /* ignore */
    }
    setActivityLog((prev) => [
      {
        id: `log-${Date.now()}`,
        at: now,
        kind: 'user.login',
        actorName: user.name,
        actorRole: user.role,
        summary: `${user.name} signed in`,
      },
      ...prev,
    ])
    return true
  }, [platformUsers])

  const logout = useCallback(() => {
    if (currentUser) {
      setActivityLog((prev) => [
        {
          id: `log-${Date.now()}`,
          at: new Date().toISOString(),
          kind: 'user.logout',
          actorName: currentUser.name,
          actorRole: currentUser.role,
          summary: `${currentUser.name} signed out`,
        },
        ...prev,
      ])
    }
    setCurrentUserId(null)
    try {
      sessionStorage.removeItem(SESSION_USER_KEY)
    } catch {
      /* ignore */
    }
  }, [currentUser])

  const updateProfile = useCallback(
    (patch: { name?: string; email?: string; password?: string }) => {
      if (!currentUserId) return
      setPlatformUsers((prev) =>
        prev.map((u) =>
          u.id === currentUserId
            ? {
                ...u,
                name: patch.name?.trim() || u.name,
                email: patch.email?.trim() || u.email,
                password: patch.password?.trim() || u.password,
              }
            : u,
        ),
      )
      logActivity('user.update', 'Profile updated')
    },
    [currentUserId, logActivity],
  )

  const updatePlatformUser = useCallback(
    (id: string, patch: Partial<PlatformUser>) => {
      setPlatformUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...patch, email: patch.email?.trim() || u.email } : u)),
      )
      logActivity('user.update', `User account updated (${patch.name ?? id})`)
    },
    [logActivity],
  )

  const deletePlatformUser = useCallback(
    (id: string) => {
      if (id === currentUserId) return
      const removed = platformUsers.find((u) => u.id === id)
      setPlatformUsers((prev) => prev.filter((u) => u.id !== id))
      if (removed) {
        logActivity('user.delete', `User removed: ${removed.name}`)
      }
    },
    [currentUserId, platformUsers, logActivity],
  )

  const addLead = useCallback(
    (
      input: Omit<
        Lead,
        | 'id'
        | 'remarks'
        | 'researchProgress'
        | 'assessmentStatus'
        | 'funnelStatus'
        | 'createdAt'
        | 'lastInteraction'
        | 'documents'
      > & { documents?: string[] },
    ) => {
      const id = `lead-${Date.now()}`
      const today = new Date().toISOString().slice(0, 10)
      const lead: Lead = {
        id,
        companyName: input.companyName,
        industry: input.industry,
        domain: input.domain,
        country: input.country,
        assignedExecutive: input.assignedExecutive,
        funnelStatus: 'intake',
        createdAt: today,
        lastInteraction: today,
        documents: input.documents ?? [],
        researchProgress: 0,
        assessmentStatus: 'draft',
        remarks: [],
      }
      setLeads((prev) => [lead, ...prev])
      setSelectedLeadId(id)
    },
    [],
  )

  const startResearch = useCallback((leadId: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, funnelStatus: 'research', researchProgress: 10 }
          : l,
      ),
    )
  }, [])

  const finishResearch = useCallback((leadId: string, research: ResearchResult) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              researchProgress: 100,
              funnelStatus: 'review',
              aiResearch: research,
              lastInteraction: new Date().toISOString().slice(0, 10),
            }
          : l,
      ),
    )
  }, [])

  const applyQuestions = useCallback(
    (next: AssessmentQuestion[]) => {
      setQuestions(syncAssessmentWithMandatory(next, mandatoryQuestions))
    },
    [mandatoryQuestions],
  )

  const syncQuestionsFromMandatory = useCallback(
    (mandatory: MandatoryQuestion[]) => {
      setQuestions((prev) => syncAssessmentWithMandatory(prev, mandatory))
    },
    [],
  )

  const addQuestion = useCallback(() => {
    setQuestions((prev) => {
      const optional = stripMandatoryFromAssessment(prev, mandatoryQuestions)
      return syncAssessmentWithMandatory(
        [...optional, newBlankQuestion(optional.length)],
        mandatoryQuestions,
      )
    })
  }, [mandatoryQuestions])

  const moveQuestionUp = useCallback(
    (id: string) => {
      setQuestions((prev) => {
        const sorted = normalizeSortOrder(prev)
        const idx = sorted.findIndex((q) => q.id === id)
        const q = sorted[idx]
        if (idx <= 0 || !q || q.isMandatory) return sorted
        const mandatoryCount = mandatoryQuestions.length
        if (idx <= mandatoryCount) return sorted
        const next = [...sorted]
        ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
        return syncAssessmentWithMandatory(normalizeSortOrder(next), mandatoryQuestions)
      })
    },
    [mandatoryQuestions],
  )

  const moveQuestionDown = useCallback(
    (id: string) => {
      setQuestions((prev) => {
        const sorted = normalizeSortOrder(prev)
        const idx = sorted.findIndex((q) => q.id === id)
        const q = sorted[idx]
        if (idx < 0 || idx >= sorted.length - 1 || !q || q.isMandatory) return sorted
        const next = [...sorted]
        ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
        return syncAssessmentWithMandatory(normalizeSortOrder(next), mandatoryQuestions)
      })
    },
    [mandatoryQuestions],
  )

  const updateQuestion = useCallback(
    (id: string, patch: Partial<AssessmentQuestion>) => {
      if (mandatoryQuestions.some((m) => m.id === id)) {
        setMandatoryQuestions((prev) => {
          const next = prev.map((m) => {
            if (m.id !== id) return m
            const type = patch.type
              ? (normalizeInputType(patch.type) as MandatoryQuestion['type'])
              : m.type
            return {
              ...m,
              text: patch.text ?? m.text,
              type,
              options: patch.options
                ? mandatoryOptionsFromAssessment(patch.options)
                : m.options,
            }
          })
          setQuestions((questions) => syncAssessmentWithMandatory(questions, next))
          return next
        })
        return
      }
      setQuestions((prev) =>
        syncAssessmentWithMandatory(
          normalizeSortOrder(
            prev.map((q) => {
              if (q.id !== id) return q
              const merged = { ...q, ...patch }
              if (patch.taxonomyPillar) {
                merged.category = pillarToCategory(patch.taxonomyPillar)
              }
              return merged
            }),
          ),
          mandatoryQuestions,
        ),
      )
    },
    [mandatoryQuestions],
  )

  const deleteQuestion = useCallback(
    (id: string) => {
      if (mandatoryQuestions.some((m) => m.id === id)) return
      setQuestions((prev) =>
        syncAssessmentWithMandatory(
          normalizeSortOrder(prev.filter((q) => q.id !== id)),
          mandatoryQuestions,
        ),
      )
    },
    [mandatoryQuestions],
  )

  const setLeadTaxonomy = useCallback((leadId: string, taxonomy: AssessmentTaxonomy) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, assessmentTaxonomy: taxonomy } : l)),
    )
  }, [])

  const setAssessmentStatus = useCallback(
    (leadId: string, status: AssessmentStatus) => {
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== leadId) return l
          const portalToken =
            status === 'approved'
              ? `${l.domain.split('.')[0]}-${Math.random().toString(36).slice(2, 6)}`
              : l.portalToken
          return {
            ...l,
            assessmentStatus: status,
            portalToken,
            funnelStatus: status === 'approved' ? 'client_portal' : l.funnelStatus,
            lastInteraction: new Date().toISOString().slice(0, 10),
          }
        }),
      )
      const lead = leads.find((l) => l.id === leadId)
      if (status === 'approved' && lead) {
        logActivity('assessment.approve', `Assessment approved for ${lead.companyName}`, {
          leadId,
          companyName: lead.companyName,
        })
      }
    },
    [leads, logActivity],
  )

  const addRemark = useCallback((leadId: string, text: string) => {
    if (!text.trim()) return
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              remarks: [...l.remarks, text.trim()],
              lastInteraction: new Date().toISOString().slice(0, 10),
            }
          : l,
      ),
    )
  }, [])

  const moveLeadStatus = useCallback((leadId: string, status: Lead['funnelStatus']) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, funnelStatus: status, lastInteraction: new Date().toISOString().slice(0, 10) }
          : l,
      ),
    )
  }, [])

  const registerPlatformUser = useCallback(
    (user: Omit<PlatformUser, 'id'>) => {
      const id = `u-${Date.now()}`
      setPlatformUsers((prev) => [
        ...prev,
        {
          ...user,
          id,
          password: user.password || 'changeme123',
        },
      ])
      logActivity('user.register', `New user registered: ${user.name}`)
    },
    [logActivity],
  )

  const addMasterDataItem = useCallback((category: MasterDataCategory, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setMasterData((prev) => {
      if (prev[category].includes(trimmed)) return prev
      return { ...prev, [category]: [...prev[category], trimmed] }
    })
  }, [])

  const updateMasterDataItem = useCallback(
    (category: MasterDataCategory, oldName: string, newName: string) => {
      const trimmed = newName.trim()
      if (!trimmed || trimmed === oldName) return
      setMasterData((prev) => {
        if (prev[category].includes(trimmed)) return prev
        return {
          ...prev,
          [category]: prev[category].map((x) => (x === oldName ? trimmed : x)),
        }
      })
    },
    [],
  )

  const deleteMasterDataItem = useCallback((category: MasterDataCategory, name: string) => {
    setMasterData((prev) => ({
      ...prev,
      [category]: prev[category].filter((x) => x !== name),
    }))
  }, [])

  const addMandatoryQuestion = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setMandatoryQuestions((prev) => {
        const next: MandatoryQuestion[] = [
          ...prev,
          {
            id: `mq-${Date.now()}`,
            text: trimmed,
            type: 'singlechoice',
            options: ['Option 1', 'Option 2', 'Option 3'],
          },
        ]
        syncQuestionsFromMandatory(next)
        return next
      })
    },
    [syncQuestionsFromMandatory],
  )

  const updateMandatoryQuestion = useCallback(
    (id: string, patch: Partial<MandatoryQuestion>) => {
      setMandatoryQuestions((prev) => {
        const next = prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
        syncQuestionsFromMandatory(next)
        return next
      })
    },
    [syncQuestionsFromMandatory],
  )

  const deleteMandatoryQuestion = useCallback(
    (id: string) => {
      setMandatoryQuestions((prev) => {
        const next = prev.filter((q) => q.id !== id)
        syncQuestionsFromMandatory(next)
        return next
      })
    },
    [syncQuestionsFromMandatory],
  )

  const saveClientResponses = useCallback(
    (
      leadId: string,
      answers: Record<string, string | number | string[]>,
      richtext: Record<string, string>,
      progress: number,
      extras?: {
        otherText?: Record<string, string>
        uploadedDocuments?: string[]
      },
    ) => {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                clientAnswers: answers,
                clientRichtext: richtext,
                clientOtherText: extras?.otherText ?? l.clientOtherText,
                clientUploadedDocuments:
                  extras?.uploadedDocuments ?? l.clientUploadedDocuments,
                clientProgress: progress,
                lastInteraction: new Date().toISOString().slice(0, 10),
              }
            : l,
        ),
      )
    },
    [],
  )

  const value = useMemo(
    () => ({
      leads,
      questions,
      selectedLeadId,
      setSelectedLeadId,
      selectedLead,
      addLead,
      startResearch,
      finishResearch,
      setQuestions: applyQuestions,
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
      logActivity,
    }),
    [
      leads,
      questions,
      selectedLeadId,
      selectedLead,
      addLead,
      startResearch,
      finishResearch,
      applyQuestions,
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
      setSelectedLeadId,
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
      logActivity,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
