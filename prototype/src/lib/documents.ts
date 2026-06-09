import type { DocumentMatchStatus, LeadDocument } from '../types'

export function formatDocumentDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function inferTransactionDate(file: File): string {
  const fromName = file.name.match(/(\d{4}[-_]\d{2}[-_]\d{2})/)
  if (fromName) return fromName[1].replace(/_/g, '-')
  return new Date(file.lastModified).toISOString().slice(0, 10)
}

export function inferMatchStatus(file: File): DocumentMatchStatus {
  const lower = file.name.toLowerCase()
  if (/(matched|reconciled|cleared|settled)/.test(lower)) return 'matched'
  if (/(unmatched|pending|exception|dispute)/.test(lower)) return 'unmatched'
  return 'unmatched'
}

export function documentFromFile(file: File, source: LeadDocument['source']): LeadDocument {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    matchStatus: inferMatchStatus(file),
    transactionDate: inferTransactionDate(file),
    uploadedAt: new Date().toISOString(),
    source,
    hasFile: true,
  }
}

/** Legacy DB rows stored documents as plain filename strings */
export function normalizeDocuments(
  records: LeadDocument[] | string[] | undefined,
  source: LeadDocument['source'] = 'intake',
): LeadDocument[] {
  if (!records?.length) return []
  if (typeof records[0] === 'string') {
    return (records as string[]).map((name, i) => demoDocumentFromName(name, source, i))
  }
  return (records as LeadDocument[]).map((d) => ({
    ...d,
    source: d.source ?? source,
    hasFile: d.hasFile ?? true,
  }))
}

export function documentNames(documents: LeadDocument[]): string[] {
  return documents.map((d) => d.name)
}

function demoDocumentFromName(
  name: string,
  source: LeadDocument['source'],
  index: number,
): LeadDocument {
  const lower = name.toLowerCase()
  const matched =
    /(matched|reconciled|overview|architecture|governance|framework)/.test(lower) ||
    index % 2 === 0
  const daysAgo = 3 + index * 7
  const tx = new Date()
  tx.setDate(tx.getDate() - daysAgo)
  return {
    id: `demo-doc-${source}-${index}-${name.replace(/\W+/g, '-')}`,
    name,
    matchStatus: matched ? 'matched' : 'unmatched',
    transactionDate: tx.toISOString().slice(0, 10),
    uploadedAt: new Date().toISOString(),
    source,
    hasFile: false,
  }
}
