import { useEffect, useState } from 'react'
import { TAXONOMY_PILLARS } from '../../shared/assessment-schema'
import type { AssessmentQuestion, AssessmentTaxonomy } from '../types'
import { inputTypeLabel, normalizeInputType } from '../lib/question-types'
import { sortQuestions } from '../lib/questions'
import { AnswerOptionsEditor } from './AnswerOptionsEditor'
import { Badge, Button, Input, Select } from './ui'

interface Props {
  questions: AssessmentQuestion[]
  taxonomy?: AssessmentTaxonomy
  rewritingId?: string | null
  onRewrite?: (id: string) => void | Promise<void>
  onUpdate: (id: string, patch: Partial<AssessmentQuestion>) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onAdd: () => void
}

function RewriteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7.5M19 5a9 9 0 00-14 7.5"
      />
    </svg>
  )
}

export function QuestionGovernanceEditor({
  questions,
  taxonomy,
  rewritingId,
  onRewrite,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAdd,
}: Props) {
  const ordered = sortQuestions(questions)
  const [index, setIndex] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (index >= ordered.length && ordered.length > 0) {
      setIndex(ordered.length - 1)
    }
  }, [ordered.length, index])

  useEffect(() => {
    setShowAdvanced(false)
  }, [index])

  if (ordered.length === 0) {
    return (
      <div className="flex min-h-[34rem] items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <div>
          <p className="text-sm text-slate-600">No questions yet.</p>
          <Button className="mt-4" onClick={onAdd}>
            Add first question
          </Button>
        </div>
      </div>
    )
  }

  const q = ordered[index]
  const inputType = normalizeInputType(q.type)
  const hasChoices = inputType === 'singlechoice' || inputType === 'multichoice'
  const isRewriting = rewritingId === q.id

  return (
    <div className="space-y-4">
      {taxonomy && (
        <details className="shrink-0 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-indigo-900">
            Domain taxonomy — {taxonomy.userDomain}
          </summary>
          <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-3">
            <div>
              <p className="font-semibold">Technical</p>
              <ul className="mt-1 list-inside list-disc">
                {taxonomy.technicalPainPoints.slice(0, 4).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Operational</p>
              <ul className="mt-1 list-inside list-disc">
                {taxonomy.operationalPainAreas.slice(0, 4).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Process</p>
              <ul className="mt-1 list-inside list-disc">
                {taxonomy.processImprovements.slice(0, 4).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Question <strong>{index + 1}</strong> of <strong>{ordered.length}</strong>
        </span>
        <Button variant="secondary" className="!text-xs" onClick={onAdd}>
          + Add
        </Button>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${((index + 1) / ordered.length) * 100}%` }}
        />
      </div>

      <div className="flex min-h-[34rem] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-6">
          <div className="mb-3 flex min-h-[1.75rem] flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {q.isMandatory && <Badge tone="amber">Mandatory</Badge>}
              <Badge tone="indigo">{q.taxonomyPillar}</Badge>
              <Badge tone="emerald">AI type: {inputTypeLabel(q.type)}</Badge>
              {q.domainContext && <Badge tone="slate">{q.domainContext}</Badge>}
            </div>
            {onRewrite && !q.isMandatory && (
              <button
                type="button"
                title="Rewrite question and options with AI"
                disabled={isRewriting || !!rewritingId}
                onClick={() => onRewrite(q.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RewriteIcon className="h-3.5 w-3.5 shrink-0" />
                {isRewriting ? 'Rewriting…' : 'Rewrite question & options'}
              </button>
            )}
          </div>
          <p
            className={`line-clamp-3 min-h-[4.5rem] text-lg font-medium leading-snug text-slate-900 ${
              isRewriting ? 'animate-pulse text-slate-400' : ''
            }`}
          >
            {q.text}
          </p>
        </div>

        <div className="min-h-[22rem] flex-1 overflow-y-auto px-6 py-4">
          {hasChoices ? (
            <div className="mb-4 rounded-lg bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-slate-500">
                {q.isMandatory ? 'Mandatory answer options' : 'Client answer options'}
              </p>
              <AnswerOptionsEditor
                questionId={q.id}
                options={q.options ?? []}
                onChange={(options) => onUpdate(q.id, { options })}
              />
            </div>
          ) : (
            <div className="mb-4 min-h-[5rem] rounded-lg bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
              {inputType === 'scale'
                ? 'Client answers on a numeric scale (slider or rating).'
                : 'Client provides a free-text response.'}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Edit question wording
            </span>
            <textarea
              className="min-h-[5rem] w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={4}
              value={q.text}
              onChange={(e) => onUpdate(q.id, { text: e.target.value })}
            />
          </label>

          <button
            type="button"
            className="mt-3 text-xs text-indigo-600 hover:underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? 'Hide advanced settings' : 'Advanced settings'}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              <Select
                label="Taxonomy pillar"
                value={q.taxonomyPillar}
                onChange={(e) =>
                  onUpdate(q.id, {
                    taxonomyPillar: e.target.value as AssessmentQuestion['taxonomyPillar'],
                  })
                }
                options={TAXONOMY_PILLARS.map((p) => ({ value: p, label: p }))}
              />
              <Input
                label="Domain context"
                value={q.domainContext}
                onChange={(e) => onUpdate(q.id, { domainContext: e.target.value })}
              />
              {!q.isMandatory && (
                <div className="flex gap-2">
                  <Button variant="ghost" className="text-rose-600" onClick={() => onDelete(q.id)}>
                    Delete question
                  </Button>
                </div>
              )}
              {q.isMandatory && (
                <p className="text-xs text-amber-700">
                  Mandatory questions cannot be deleted here. Manage them in Administration.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2">
        <Button
          variant="secondary"
          disabled={index === 0}
          onClick={() => {
            onMoveUp(q.id)
            setIndex((i) => Math.max(0, i - 1))
          }}
        >
          ← Previous
        </Button>
        {!q.isMandatory ? (
          <span className="text-xs text-slate-500">
            Reorder:{' '}
            <button type="button" className="text-indigo-600" onClick={() => onMoveUp(q.id)}>
              ↑
            </button>{' '}
            <button type="button" className="text-indigo-600" onClick={() => onMoveDown(q.id)}>
              ↓
            </button>
          </span>
        ) : (
          <span className="text-xs text-amber-700">Mandatory — fixed at start</span>
        )}
        <Button
          variant="primary"
          disabled={index >= ordered.length - 1}
          onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
