export const INDUSTRY_OTHER = 'Other'

export interface IndustryVerticalOption {
  value: string
  label: string
  description: string
}

export const INDUSTRY_VERTICALS: IndustryVerticalOption[] = [
  {
    value: 'Supply Chain & Logistics',
    label: 'Supply Chain & Logistics',
    description: 'Warehousing, freight, 3PL, last-mile delivery, inventory orchestration',
  },
  {
    value: 'Retail & E-commerce',
    label: 'Retail & E-commerce',
    description: 'Omnichannel, merchandising, loyalty, marketplace, store operations',
  },
  {
    value: 'Manufacturing & Industrial',
    label: 'Manufacturing & Industrial',
    description: 'Discrete/process manufacturing, OT/IT, quality, predictive maintenance',
  },
  {
    value: 'Financial Services',
    label: 'Financial Services',
    description: 'Banking, insurance, capital markets, payments, fraud, regulatory reporting',
  },
  {
    value: 'Healthcare & Life Sciences',
    label: 'Healthcare & Life Sciences',
    description: 'Providers, payers, pharma, medtech, clinical data, HIPAA/GxP',
  },
  {
    value: 'Energy & Utilities',
    label: 'Energy & Utilities',
    description: 'Power generation, grid, oil & gas, renewables, asset-intensive ops',
  },
  {
    value: 'Technology & Software',
    label: 'Technology & Software',
    description: 'SaaS, platforms, devops, product-led growth, API-first businesses',
  },
  {
    value: 'Government Department',
    label: 'Government Department',
    description: 'Federal, state, and local agencies, ministries, and public administration',
  },
  {
    value: 'Public Sector & Education',
    label: 'Public Sector & Education',
    description: 'Universities, schools, civic services, grant-funded programs',
  },
  {
    value: 'Telecommunications & Media',
    label: 'Telecommunications & Media',
    description: 'Telco networks, streaming, content, subscriber experience',
  },
  {
    value: 'Professional Services',
    label: 'Professional Services',
    description: 'Consulting, legal, accounting, staffing, knowledge-work automation',
  },
  {
    value: INDUSTRY_OTHER,
    label: 'Other industry vertical',
    description: 'Your sector is not listed — describe it below',
  },
]

export function resolveIndustryVertical(
  selected: string,
  otherDetail: string,
): string {
  if (selected === INDUSTRY_OTHER) {
    const detail = otherDetail.trim()
    return detail ? `Other — ${detail}` : 'Other — (not specified)'
  }
  return selected
}
