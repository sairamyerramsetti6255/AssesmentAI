import type { Lead, UseCase } from '../types'
import { leadStatusOptions, leadTypeOptions } from '../data/constants'
import { PBS_COMPANY, PBS_PROPOSAL_SECTIONS } from './proposal-branding'
import { PBS_LOGO_BASE64 } from './pbs-logo-base64'
import {
  defaultSolutionName,
  proposalDocumentFromLegacy,
  type ProposalDocument,
} from './proposal-document'

const FONT = 'Calibri, Arial, sans-serif'
const BLUE = '#0070C0'
/** Minimum readable size per user requirement */
const MIN_PT = '10.5pt'
const BODY_PT = '11pt'
const BODY_LH_PT = '13.2pt'
const PARA_MB = '4pt'
const BULLET_MB = '2pt'
/** Never use mso-line-height-rule:exactly with unitless ratios — Word treats 1.15 as 1.15pt */
const PARA_STYLE = `margin-top:0;margin-bottom:${PARA_MB};font-family:${FONT};font-size:${BODY_PT};line-height:${BODY_LH_PT};mso-line-height-rule:at-least;color:#1f2937;`

function labelFor<T extends { value: string; label: string }>(options: T[], value?: string) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Paragraphs only on explicit blank-line breaks — no extra sentence splits */
function formatBodyText(text: string, className = 'body'): string {
  const raw = text?.trim()
  if (!raw) {
    return `<p class="MsoNormal ${className}" style="${PARA_STYLE}">&mdash;</p>`
  }

  const parts = raw
    .split(/\n\s*\n/)
    .map((p) => normalizeText(p))
    .filter(Boolean)

  const paragraphs = parts.length > 0 ? parts : [normalizeText(raw)]

  return paragraphs
    .map(
      (p) =>
        `<p class="MsoNormal ${className}" style="${PARA_STYLE}text-align:justify;"><span style="font-size:${BODY_PT};font-family:${FONT};">${escapeHtml(p)}</span></p>`,
    )
    .join('')
}

/** Word-friendly bullets with hanging indent (renders reliably in .doc) */
function bulletsHtml(items: string[]): string {
  if (!items.length) {
    return `<p class="MsoNormal" style="${PARA_STYLE}color:#64748b;font-style:italic;">&mdash;</p>`
  }
  return items
    .map(
      (item) =>
        `<p class="MsoNormal" style="margin-top:0;margin-bottom:${BULLET_MB};margin-left:0.35in;text-indent:-0.2in;font-family:${FONT};font-size:${BODY_PT};line-height:${BODY_LH_PT};mso-line-height-rule:at-least;color:#1f2937;"><span style="font-family:Symbol;font-size:${MIN_PT};color:${BLUE};">&#183;</span><span style="font-size:${BODY_PT};font-family:${FONT};padding-left:4pt;">${escapeHtml(normalizeText(item))}</span></p>`,
    )
    .join('')
}

function subheadingHtml(text: string): string {
  return `<p class="MsoNormal" style="margin:4pt 0 2pt 0;font-family:${FONT};font-size:${BODY_PT};font-weight:bold;line-height:${BODY_LH_PT};mso-line-height-rule:at-least;color:#334155;"><span style="font-size:${BODY_PT};font-family:${FONT};">${escapeHtml(text)}</span></p>`
}

function capabilityTitleHtml(text: string): string {
  return `<p class="MsoNormal" style="margin:8pt 0 2pt 0;font-family:${FONT};font-size:12pt;font-weight:bold;line-height:14.4pt;mso-line-height-rule:at-least;color:#1e3a5f;border-bottom:1pt solid #dbeafe;padding-bottom:2pt;"><span style="font-size:12pt;font-family:${FONT};">${escapeHtml(text)}</span></p>`
}

function phaseTitleHtml(title: string, period: string): string {
  return `<p class="MsoNormal" style="margin:8pt 0 1pt 0;font-family:${FONT};font-size:12pt;font-weight:bold;line-height:14.4pt;mso-line-height-rule:at-least;color:#1e3a5f;"><span style="font-size:12pt;font-family:${FONT};">${escapeHtml(title)}</span></p><p class="MsoNormal" style="margin:0 0 2pt 0;font-family:${FONT};font-size:${BODY_PT};font-weight:bold;line-height:${BODY_LH_PT};mso-line-height-rule:at-least;color:${BLUE};"><span style="font-size:${BODY_PT};font-family:${FONT};">${escapeHtml(period)}</span></p>`
}

function sectionHtml(id: string, title: string, body: string, pageBreakBefore = false): string {
  const breakStyle = pageBreakBefore ? 'page-break-before:always;' : ''
  return `<div style="${breakStyle}margin-top:12pt;"><p id="${id}" class="MsoNormal" style="margin:0 0 4pt 0;padding-bottom:3pt;border-bottom:2pt solid ${BLUE};font-family:${FONT};font-size:14pt;font-weight:bold;line-height:16.8pt;mso-line-height-rule:at-least;color:${BLUE};text-transform:uppercase;letter-spacing:0.5pt;"><span style="font-size:14pt;font-family:${FONT};">${escapeHtml(title)}</span></p>${body}</div>`
}

function tocHtml(): string {
  const rows = PBS_PROPOSAL_SECTIONS.map((title, i) => {
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return `
      <tr>
        <td style="width:28pt;padding:3pt 8pt 3pt 0;font-family:${FONT};font-size:${BODY_PT};color:${BLUE};vertical-align:top;"><span style="font-size:${BODY_PT};">${i + 1}.</span></td>
        <td style="padding:3pt 0;font-family:${FONT};font-size:${BODY_PT};vertical-align:top;">
          <a href="#${id}" style="font-size:${BODY_PT};font-family:${FONT};color:${BLUE};text-decoration:none;">${escapeHtml(title)}</a>
        </td>
      </tr>`
  }).join('')

  return `
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:18pt 0 24pt 0;border:1pt solid #b8d4e8;background:#f8fbfd;">
    <tr>
      <td colspan="2" style="padding:10pt 14pt 8pt 14pt;font-family:${FONT};font-size:12pt;font-weight:bold;color:${BLUE};border-bottom:1pt solid #b8d4e8;"><span style="font-size:12pt;font-family:${FONT};">Table of Contents</span>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:10pt 14pt 14pt 14pt;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          ${rows}
        </table>
      </td>
    </tr>
  </table>`
}

function coverMetaTable(lead: Lead, docDate: string, submitted: string): string {
  const rows: [string, string][] = [
    ['Prepared For', lead.companyName],
    ['Prepared By', `${PBS_COMPANY.legalName} (${PBS_COMPANY.shortName})`],
    ['Document Type', PBS_COMPANY.documentType],
    ['Date', docDate],
    ['Industry', `${lead.industry} · Region: ${lead.country}`],
    ['Primary Contact', lead.clientEmail || '—'],
    ['Phone', lead.clientPhone || '—'],
    ['Account Executive', lead.assignedExecutive || '—'],
    ['Lead Status', labelFor(leadStatusOptions, lead.leadStatus)],
    ['Lead Type', labelFor(leadTypeOptions, lead.leadType)],
    ['Client Assessment Completed', submitted],
  ]

  const trs = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="width:200pt;padding:5pt 12pt 5pt 0;font-family:${FONT};font-size:${MIN_PT};font-weight:bold;color:#475569;vertical-align:top;white-space:nowrap;"><span style="font-size:${MIN_PT};font-family:${FONT};">${escapeHtml(label)}:</span></td>
        <td style="padding:5pt 0;font-family:${FONT};font-size:${MIN_PT};color:#1f2937;vertical-align:top;line-height:12.6pt;mso-line-height-rule:at-least;"><span style="font-size:${MIN_PT};font-family:${FONT};">${escapeHtml(value)}</span></td>
      </tr>`,
    )
    .join('')

  return `
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:20pt 0 8pt 0;border:1pt solid #cbd5e1;background:#f8fafc;">
    <tr><td style="padding:12pt 16pt;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">${trs}</table>
    </td></tr>
  </table>`
}

function wordStyles(): string {
  return `
  @page Section1 {
    size: 8.5in 11in;
    margin: 1in 1in 1in 1in;
  }
  div.Section1 { page: Section1; }
  body, .MsoNormal {
    font-family: ${FONT};
    font-size: ${BODY_PT};
    color: #1f2937;
    line-height: ${BODY_LH_PT};
    mso-line-height-rule: at-least;
    margin: 0;
  }
  p.MsoNormal, li.MsoNormal, div.MsoNormal {
    margin-top: 0;
    margin-right: 0;
    margin-bottom: ${PARA_MB};
    margin-left: 0;
    font-size: ${BODY_PT};
    font-family: ${FONT};
    line-height: ${BODY_LH_PT};
    mso-line-height-rule: at-least;
  }
  a { color: ${BLUE}; text-decoration: none; font-size: ${BODY_PT}; }
  span { font-size: ${BODY_PT}; font-family: ${FONT}; }
  `
}

function resolveDocument(
  lead: Lead,
  useCases: UseCase[],
  architecture: NonNullable<Lead['proposalArchitecture']>,
  summary: string,
  nextSteps: string[],
  document?: ProposalDocument,
): ProposalDocument {
  if (document) return document
  if (lead.proposalDocument) return lead.proposalDocument
  return proposalDocumentFromLegacy(lead, useCases, summary, nextSteps, architecture)
}

export function buildProposalHtml(
  lead: Lead,
  useCases: UseCase[],
  architecture: NonNullable<Lead['proposalArchitecture']>,
  summary: string,
  nextSteps: string[],
  document?: ProposalDocument,
): string {
  const doc = resolveDocument(lead, useCases, architecture, summary, nextSteps, document)
  const solutionName = doc.solutionName || defaultSolutionName(lead.companyName)
  const docDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const logoSrc = `data:image/png;base64,${PBS_LOGO_BASE64}`

  const executiveSummaryText = doc.executiveSummary?.trim() || summary?.trim() || ''

  const capabilitiesHtml = doc.functionalCapabilities
    .map((cap) => `${capabilityTitleHtml(cap.title)}${formatBodyText(cap.intro)}${bulletsHtml(cap.bullets)}`)
    .join('')

  const phasesHtml = doc.implementationPhases
    .map((phase) => `${phaseTitleHtml(phase.title, phase.period)}${bulletsHtml(phase.activities)}`)
    .join('')

  const securityBlock = `<p class="MsoNormal" style="margin:4pt 0 2pt 0;font-family:${FONT};font-size:${BODY_PT};font-weight:bold;line-height:${BODY_LH_PT};mso-line-height-rule:at-least;color:#334155;"><span style="font-size:${BODY_PT};font-family:${FONT};">Security Principles</span></p>${bulletsHtml(doc.securityPrinciples)}<p class="MsoNormal" style="margin:6pt 0 2pt 0;font-family:${FONT};font-size:${BODY_PT};font-weight:bold;line-height:${BODY_LH_PT};mso-line-height-rule:at-least;color:#334155;"><span style="font-size:${BODY_PT};font-family:${FONT};">Governance Principles</span></p>${bulletsHtml(doc.governancePrinciples)}`

  const bodySections = [
    sectionHtml(
      'executive-summary',
      'Executive Summary',
      `<div style="background:#f0f7fc;border-left:4pt solid ${BLUE};padding:8pt 12pt;margin-bottom:0;">${formatBodyText(executiveSummaryText, 'summary')}</div>`,
      true,
    ),
    sectionHtml(
      'business-challenge',
      'Business Challenge',
      `${formatBodyText(doc.businessChallenge)}${subheadingHtml('Key concerns identified include:')}${bulletsHtml(doc.businessChallengePoints)}`,
    ),
    sectionHtml(
      'proposed-solution',
      'Proposed Solution',
      `${formatBodyText(doc.proposedSolution)}${bulletsHtml(doc.proposedSolutionPoints)}`,
    ),
    sectionHtml(
      'strategic-objectives',
      'Strategic Objectives',
      `${subheadingHtml(`The primary objectives of ${solutionName} are to:`)}${bulletsHtml(doc.strategicObjectives)}`,
    ),
    sectionHtml(
      'minimum-remarkable-product-mrp-approach',
      'Minimum Remarkable Product (MRP) Approach',
      `${formatBodyText(doc.mrpApproach)}${subheadingHtml(`The MRP approach allows ${lead.companyName} to:`)}${bulletsHtml(doc.mrpBenefits)}${subheadingHtml('The initial operational workflow focus is:')}<p class="MsoNormal" style="margin:0 0 ${PARA_MB} 0;font-family:${FONT};font-size:12pt;font-weight:bold;line-height:14.4pt;mso-line-height-rule:at-least;color:${BLUE};"><span style="font-size:12pt;font-family:${FONT};">${escapeHtml(doc.mrpWorkflowFocus)}</span></p>`,
    ),
    sectionHtml('proposed-functional-capabilities', 'Proposed Functional Capabilities', capabilitiesHtml),
    sectionHtml(
      'security-governance-approach',
      'Security & Governance Approach',
      `${formatBodyText('Security and governance are foundational design principles of this initiative. The proposed solution is designed to operate within a controlled and secure environment.')}${securityBlock}`,
    ),
    sectionHtml(
      'proposed-implementation-timeline',
      'Proposed Implementation Timeline',
      `${formatBodyText('The proposed implementation window for the Minimum Remarkable Product is approximately 30 days.')}${phasesHtml}`,
    ),
    sectionHtml(
      'expected-operational-outcomes',
      'Expected Operational Outcomes',
      `${subheadingHtml(`Upon completion of the MRP phase, ${lead.companyName} is expected to have:`)}${bulletsHtml(doc.expectedOutcomes)}`,
    ),
    sectionHtml(
      'success-indicators',
      'Success Indicators',
      `${subheadingHtml('The following performance indicators are proposed to measure initial MRP success:')}${bulletsHtml(doc.successIndicators)}`,
    ),
    sectionHtml(
      'potential-future-enhancements',
      'Potential Future Enhancements',
      `${subheadingHtml('Following successful validation of the MRP phase, future expansion opportunities may include:')}${bulletsHtml(doc.futureEnhancements)}`,
    ),
    sectionHtml(
      'discussion-alignment-items',
      'Discussion & Alignment Items',
      `${subheadingHtml('The following areas are recommended for executive review and feedback prior to project initiation:')}${bulletsHtml(doc.discussionItems)}`,
    ),
    sectionHtml(
      'closing-statement',
      'Closing Statement',
      `${formatBodyText(doc.closingStatement)}<p class="MsoNormal" style="margin:10pt 0 2pt 0;font-family:${FONT};font-size:${BODY_PT};font-weight:bold;line-height:${BODY_LH_PT};mso-line-height-rule:at-least;color:${BLUE};"><span style="font-size:${BODY_PT};font-family:${FONT};">${escapeHtml(PBS_COMPANY.legalName)} (${escapeHtml(PBS_COMPANY.shortName)})</span></p><p class="MsoNormal" style="margin:0;font-family:${FONT};font-size:${MIN_PT};line-height:12.6pt;mso-line-height-rule:at-least;color:${BLUE};letter-spacing:1pt;"><span style="font-size:${MIN_PT};font-family:${FONT};">${escapeHtml(PBS_COMPANY.tagline)}</span></p>`,
    ),
  ].join('')

  const submitted = lead.clientAssessmentSubmittedAt
    ? new Date(lead.clientAssessmentSubmittedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Pending'

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<meta name="ProgId" content="Word.Document"/>
<meta name="Generator" content="Assessment Platform"/>
<title>${escapeHtml(solutionName)} — Scope of Work — ${escapeHtml(lead.companyName)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
    <w:ValidateAgainstSchemas/>
    <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
    <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
    <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
    <w:Compatibility>
      <w:BreakWrappedTables/>
      <w:SnapToGridInCell/>
      <w:WrapTextWithPunct/>
      <w:UseAsianBreakRules/>
    </w:Compatibility>
  </w:WordDocument>
  <w:LatentStyles DefLockedState="false" LatentStyleCount="0"/>
  <w:Styles>
    <w:Style w:Type="paragraph" w:Default="on" w:StyleId="Normal">
      <w:Name w:Val="Normal"/>
      <w:QFormat/>
      <w:Rsid w:Val="00000000"/>
      <w:PPr><w:Spacing w:After="80" w:Line="240" w:LineRule="atLeast"/></w:PPr>
      <w:RPr>
        <w:RFonts w:Ascii="Calibri" w:HAnsi="Calibri"/>
        <w:Sz w:Val="22"/>
        <w:SzCs w:Val="22"/>
      </w:RPr>
    </w:Style>
  </w:Styles>
</xml>
<![endif]-->
<style>
${wordStyles()}
</style>
</head>
<body>
<div class="Section1">

  <!-- Cover -->
  <div style="text-align:center;margin-bottom:8pt;">
    <p style="margin:0 0 14pt 0;text-align:center;">
      <img src="${logoSrc}" alt="${escapeHtml(PBS_COMPANY.shortName)} Logo" width="120" height="120" style="display:inline-block;"/>
    </p>
    <p class="MsoNormal" style="margin:0 0 8pt 0;font-family:${FONT};font-size:26pt;font-weight:bold;color:${BLUE};line-height:31pt;mso-line-height-rule:at-least;"><span style="font-size:26pt;font-family:${FONT};">${escapeHtml(solutionName)}</span></p>
    <p class="MsoNormal" style="margin:0 0 4pt 0;font-family:${FONT};font-size:14pt;font-weight:600;color:#334155;line-height:16.8pt;mso-line-height-rule:at-least;"><span style="font-size:14pt;font-family:${FONT};">Executive Solution Overview &amp; Scope of Work</span></p>
  </div>

  ${coverMetaTable(lead, docDate, submitted)}
  ${tocHtml()}

  ${bodySections}

  <div style="margin-top:36pt;padding-top:14pt;border-top:2pt solid ${BLUE};text-align:center;">
    <p class="MsoNormal" style="margin:0;font-family:${FONT};font-size:${BODY_PT};font-weight:bold;color:${BLUE};letter-spacing:2pt;line-height:${BODY_LH_PT};mso-line-height-rule:at-least;"><span style="font-size:${BODY_PT};font-family:${FONT};">${escapeHtml(PBS_COMPANY.tagline.toUpperCase())}</span></p>
    <p class="MsoNormal" style="margin:10pt 0 0 0;font-family:${FONT};font-size:${MIN_PT};color:#64748b;line-height:12.6pt;mso-line-height-rule:at-least;"><span style="font-size:${MIN_PT};font-family:${FONT};">Confidential — ${escapeHtml(lead.companyName)} · ${escapeHtml(PBS_COMPANY.legalName)}</span></p>
  </div>

</div>
</body>
</html>`
}

export function downloadProposalWord(
  lead: Lead,
  useCases: UseCase[],
  architecture: NonNullable<Lead['proposalArchitecture']>,
  summary: string,
  nextSteps: string[],
  proposalDoc?: ProposalDocument,
) {
  const html = buildProposalHtml(lead, useCases, architecture, summary, nextSteps, proposalDoc)
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const solutionName = proposalDoc?.solutionName ?? lead.proposalDocument?.solutionName ?? defaultSolutionName(lead.companyName)
  a.download = `${sanitizeFilename(lead.companyName)}-${sanitizeFilename(solutionName)}-Scope-of-Work.doc`
  a.click()
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'proposal'
}
