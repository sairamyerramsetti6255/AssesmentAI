/**
 * Domain-agnostic modular assessment configuration.
 * Input: userDomain (e.g. lead industry + company context) → dynamic taxonomy + questions.
 */

export const TAXONOMY_PILLARS = [
  'Technical Pain Points',
  'Non-Technical / Operational Pain Areas',
  'Process Improvements',
] as const

export type TaxonomyPillar = (typeof TAXONOMY_PILLARS)[number]

export interface DomainAssessmentConfig {
  userDomain: string
  taxonomy: {
    technicalPainPoints: string[]
    operationalPainAreas: string[]
    processImprovements: string[]
  }
  questions: Array<{
    taxonomyPillar: TaxonomyPillar
    domainContext: string
    text: string
    type: 'slider' | 'multiselect' | 'richtext' | 'rating'
    options?: string[]
    suggestedOptions?: string[]
    sortOrder: number
  }>
}

/** Example: Healthcare (multi-faceted) — demonstrates taxonomy adaptation */
export const EXAMPLE_HEALTHCARE_CONFIG: DomainAssessmentConfig = {
  userDomain: 'Healthcare — Hospital & Clinical Networks',
  taxonomy: {
    technicalPainPoints: [
      'Legacy EHR silos and HL7/FHIR interface gaps',
      'Clinical data lake immaturity and consent tagging',
      'Medical imaging PACS integration latency',
      'API rate limits on payer eligibility systems',
    ],
    operationalPainAreas: [
      'HIPAA / regional privacy compliance for AI training',
      'Clinical staff AI literacy and nursing change fatigue',
      'Joint commission documentation for algorithmic triage',
      'Vendor BAA negotiation cycles',
    ],
    processImprovements: [
      'Manual prior-authorization fax workflows',
      'Bed management staffing allocation',
      'Discharge planning handoff delays',
      'Operating room block scheduling conflicts',
    ],
  },
  questions: [
    {
      taxonomyPillar: 'Technical Pain Points',
      domainContext: 'EHR interoperability',
      text: 'How would you rate real-time clinical data availability across acute and ambulatory EHR instances?',
      type: 'slider',
      sortOrder: 0,
    },
    {
      taxonomyPillar: 'Technical Pain Points',
      domainContext: 'API limitations',
      text: 'Which integration constraints most block AI-assisted care pathways?',
      type: 'multiselect',
      options: [
        'HL7 v2 only',
        'FHIR R4 partial',
        'Batch-only payer APIs',
        'On-prem imaging VLAN isolation',
      ],
      suggestedOptions: ['SMART-on-FHIR app approval backlog'],
      sortOrder: 1,
    },
    {
      taxonomyPillar: 'Non-Technical / Operational Pain Areas',
      domainContext: 'Compliance',
      text: 'Describe your governance process for models that influence triage or treatment recommendations.',
      type: 'richtext',
      sortOrder: 2,
    },
    {
      taxonomyPillar: 'Process Improvements',
      domainContext: 'Prior authorization',
      text: 'What percentage of prior-auth cases still require manual intervention?',
      type: 'rating',
      sortOrder: 3,
    },
  ],
}

export const ASSESSMENT_ARCHITECT_SYSTEM = `You are a Domain-Agnostic AI & Process Architect designing a modular assessment configuration.

Given a [User Domain] (client industry + company context), produce:
1. technicalPainPoints — legacy systems, data silos, API limits, infra gaps
2. operationalPainAreas — compliance, skill gaps, change management, sponsorship
3. processImprovements — manual bottlenecks, resource allocation, workflow friction

Then generate 12–15 assessment questions ordered for client completion.

AUTO-SELECT input type per question (do NOT default everything to text):
- "singlechoice" — exactly one answer fits (yes/no, primary system, main blocker). Provide 4–6 concrete "options" (do NOT include "Other" — added by system).
- "multichoice" — several answers may apply. Provide 5–7 concrete "options".
- "scale" — maturity, readiness, or degree 1–10 (no options array).
- "text" — ONLY when no reasonable discrete answers exist (open narrative). No options.

Rules:
- Prefer singlechoice or multichoice whenever possible (~70% of questions).
- Each question maps to one taxonomyPillar: "Technical Pain Points" | "Non-Technical / Operational Pain Areas" | "Process Improvements"
- domainContext: short label from that pillar's taxonomy
- suggestedOptions: 2–3 extra options executives may add later (not shown to client by default)
- Questions must be specific to the [User Domain]

Return valid JSON only:
{
  "userDomain": "string",
  "taxonomy": {
    "technicalPainPoints": ["string"],
    "operationalPainAreas": ["string"],
    "processImprovements": ["string"]
  },
  "questions": [{
    "taxonomyPillar": "Technical Pain Points",
    "domainContext": "string",
    "text": "string",
    "type": "singlechoice|multichoice|scale|text",
    "options": [],
    "suggestedOptions": [],
    "sortOrder": 0
  }]
}`
