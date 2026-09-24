import type { Lead } from '../types'

/** True when Agent Research has finished and brief data is available for question generation. */
export function isResearchReady(lead?: Lead): boolean {
  if (!lead) return false
  const brief = lead.aiResearch?.executiveBrief?.trim()
  if (brief) return true
  return (lead.researchProgress ?? 0) >= 100 && Boolean(lead.aiResearch)
}
