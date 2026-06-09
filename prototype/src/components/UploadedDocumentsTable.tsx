import { downloadLeadDocument } from '../lib/api'
import { formatDocumentDate } from '../lib/documents'
import type { LeadDocument } from '../types'
import { Badge, Button } from './ui'

export function UploadedDocumentsTable({
  leadId,
  documents,
  portalToken,
  emptyMessage = 'No documents uploaded yet.',
}: {
  leadId?: string
  documents: LeadDocument[]
  /** Client portal — download without staff auth token */
  portalToken?: string
  emptyMessage?: string
}) {
  if (!documents.length) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>
  }

  const handleDownload = async (doc: LeadDocument) => {
    try {
      await downloadLeadDocument({
        leadId,
        portalToken,
        docId: doc.id,
        filename: doc.name,
      })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download failed')
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Document name
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Match status
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Transaction date
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Download
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-medium text-slate-800">{doc.name}</td>
              <td className="px-4 py-3">
                <Badge tone={doc.matchStatus === 'matched' ? 'emerald' : 'rose'}>
                  {doc.matchStatus === 'matched' ? 'Matched' : 'Unmatched'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDocumentDate(doc.transactionDate)}</td>
              <td className="px-4 py-3 text-right">
                {leadId || portalToken ? (
                  <Button
                    variant="secondary"
                    className="!px-2.5 !py-1 !text-xs"
                    onClick={() => void handleDownload(doc)}
                  >
                    Download
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">Pending upload</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
