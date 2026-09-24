import type { Lead, UseCase } from '../types'
import { PBS_COMPANY } from './proposal-branding'

export interface ProposalCapability {
  title: string
  intro: string
  bullets: string[]
}

export interface ProposalPhase {
  title: string
  period: string
  activities: string[]
}

/** Full scope-of-work structure aligned to the PBS Word template */
export interface ProposalDocument {
  solutionName: string
  executiveSummary: string
  businessChallenge: string
  businessChallengePoints: string[]
  proposedSolution: string
  proposedSolutionPoints: string[]
  strategicObjectives: string[]
  mrpApproach: string
  mrpBenefits: string[]
  mrpWorkflowFocus: string
  functionalCapabilities: ProposalCapability[]
  securityPrinciples: string[]
  governancePrinciples: string[]
  implementationPhases: ProposalPhase[]
  expectedOutcomes: string[]
  successIndicators: string[]
  futureEnhancements: string[]
  discussionItems: string[]
  closingStatement: string
}

export function defaultSolutionName(companyName: string): string {
  const base = companyName.replace(/\s+(Inc\.?|Ltd\.?|LLC|Corp\.?|Services?)$/i, '').trim()
  return `${base} AI`
}

export function proposalDocumentFromLegacy(
  lead: Lead,
  useCases: UseCase[],
  summary: string,
  nextSteps: string[],
  architecture: NonNullable<Lead['proposalArchitecture']>,
): ProposalDocument {
  return {
    solutionName: defaultSolutionName(lead.companyName),
    executiveSummary: summary,
    businessChallenge:
      `As communication and operational volumes grow, ${lead.companyName} faces increasing pressure to maintain accuracy, visibility, and timely response across critical workflows.`,
    businessChallengePoints: useCases.map((uc) => uc.gap),
    proposedSolution:
      `An AI-assisted platform tailored for ${lead.companyName} to improve operational awareness, prioritization, and governed human oversight.`,
    proposedSolutionPoints: useCases.map((uc) => uc.solution),
    strategicObjectives: [
      'Ensure critical items are never missed',
      'Improve response visibility and accountability',
      'Reduce manual triage overhead',
      'Maintain a secure and controlled AI operating environment',
    ],
    mrpApproach:
      'The initial implementation will be delivered as a Minimum Remarkable Product focused on high-value workflows that can be validated rapidly within a secure environment.',
    mrpBenefits: [
      'Rapidly validate operational value',
      'Reduce implementation complexity',
      'Minimize deployment risk',
      'Establish governance and adoption processes early',
    ],
    mrpWorkflowFocus: 'Detect → Prioritize → Escalate → Validate → Track',
    functionalCapabilities: useCases.map((uc) => ({
      title: uc.gap,
      intro: uc.solution,
      bullets: [
        `Implementation horizon: ${uc.horizon === 'pilot' ? 'Immediate pilot (0–90 days)' : 'Long-term transformation (6–18 months)'}`,
        `Expected business impact: ${uc.impact === 'high' ? 'High' : 'Medium'}`,
      ],
    })),
    securityPrinciples: [
      architecture.security || 'Controlled data handling practices',
      architecture.hosting || 'Private deployment architecture',
      'Role-based access controls',
      'Full auditability of user actions and workflows',
    ].filter(Boolean),
    governancePrinciples: [
      architecture.access || 'Human validation remains mandatory',
      'Transparent classifications and reasoning',
      'Escalation accountability is enforced',
      'Operational activities remain traceable',
    ].filter(Boolean),
    implementationPhases: [
      {
        title: 'Phase 1 — Discovery & Workflow Alignment',
        period: 'Week 1',
        activities: nextSteps.slice(0, 4).length
          ? nextSteps.slice(0, 4)
          : ['Finalize operational workflows', 'Align governance expectations'],
      },
      {
        title: 'Phase 2 — Core Platform Development',
        period: 'Week 2',
        activities: [architecture.pipelines || 'Implement core AI classification capabilities'],
      },
      {
        title: 'Phase 3 — Escalation & Validation Workflows',
        period: 'Week 3',
        activities: ['Configure alerting and escalation workflows', 'Establish audit and logging processes'],
      },
      {
        title: 'Phase 4 — Testing, Pilot & Validation',
        period: 'Week 4',
        activities: ['Conduct system testing and refinement', 'Pilot with selected users'],
      },
    ],
    expectedOutcomes: [
      'A functional AI-assisted operational platform',
      'Improved visibility into critical workflows',
      'Structured escalation accountability',
      'A secure and governed operating environment',
    ],
    successIndicators: [
      'High accuracy in operational classification',
      'Reduced response times for urgent matters',
      'Positive operational user adoption',
      'Stable and secure platform operation',
    ],
    futureEnhancements: [
      'Expanded system integrations',
      'Advanced reporting and analytics',
      'Workflow automation enhancements',
      'Predictive operational intelligence',
    ],
    discussionItems: nextSteps.length
      ? nextSteps
      : [
          'Workflow priorities',
          'Escalation ownership structure',
          'Security and deployment preferences',
          'Success measurement criteria',
        ],
    closingStatement: `${PBS_COMPANY.shortName} looks forward to collaborating closely with ${lead.companyName} to refine the approach, align operational requirements, and determine the most effective path forward for implementation.`,
  }
}
