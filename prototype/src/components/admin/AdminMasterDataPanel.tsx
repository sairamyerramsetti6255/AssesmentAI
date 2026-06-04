import { useState } from 'react'
import type { MandatoryQuestion, MasterDataCategory } from '../../types'
import { MASTER_DATA_LABELS } from '../../data/admin-master-data'
import { AnswerOptionsEditor, stripOtherFromOptions } from '../AnswerOptionsEditor'
import { Badge, Button, Card, Input, Select } from '../ui'

type Tab = MasterDataCategory | 'questions'

const tabs: { id: Tab; label: string }[] = [
  { id: 'industries', label: 'Industries' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'solutions', label: 'Solutions' },
  { id: 'painPoints', label: 'Pain Points' },
  { id: 'maturityStages', label: 'Maturity Stages' },
  { id: 'questions', label: 'Mandatory Questions' },
]

function PencilIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  )
}

interface Props {
  masterData: Record<MasterDataCategory, string[]>
  mandatoryQuestions: MandatoryQuestion[]
  onAddMasterItem: (category: MasterDataCategory, name: string) => void
  onUpdateMasterItem: (category: MasterDataCategory, oldName: string, newName: string) => void
  onDeleteMasterItem: (category: MasterDataCategory, name: string) => void
  onAddMandatoryQuestion: (text: string) => void
  onUpdateMandatoryQuestion: (id: string, patch: Partial<MandatoryQuestion>) => void
  onDeleteMandatoryQuestion: (id: string) => void
}

export function AdminMasterDataPanel({
  masterData,
  mandatoryQuestions,
  onAddMasterItem,
  onUpdateMasterItem,
  onDeleteMasterItem,
  onAddMandatoryQuestion,
  onUpdateMandatoryQuestion,
  onDeleteMandatoryQuestion,
}: Props) {
  const [tab, setTab] = useState<Tab>('questions')
  const [newItemName, setNewItemName] = useState('')
  const [newQuestionText, setNewQuestionText] = useState('')
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<MandatoryQuestion | null>(null)
  const [editingMaster, setEditingMaster] = useState<{
    category: MasterDataCategory
    name: string
  } | null>(null)
  const [masterEditDraft, setMasterEditDraft] = useState('')

  const clearEdits = () => {
    setEditingQuestionId(null)
    setEditDraft(null)
    setEditingMaster(null)
    setMasterEditDraft('')
  }

  const startEditQuestion = (q: MandatoryQuestion) => {
    setEditingMaster(null)
    setMasterEditDraft('')
    setEditingQuestionId(q.id)
    setEditDraft({ ...q, options: [...q.options] })
  }

  const saveQuestionEdit = () => {
    if (!editingQuestionId || !editDraft) return
    const options =
      editDraft.type === 'scale' || editDraft.type === 'text' ? [] : [...editDraft.options]
    onUpdateMandatoryQuestion(editingQuestionId, {
      text: editDraft.text.trim(),
      type: editDraft.type,
      options,
    })
    clearEdits()
  }

  const startEditMaster = (category: MasterDataCategory, name: string) => {
    setEditingQuestionId(null)
    setEditDraft(null)
    setEditingMaster({ category, name })
    setMasterEditDraft(name)
  }

  const saveMasterEdit = () => {
    if (!editingMaster || !masterEditDraft.trim()) return
    onUpdateMasterItem(editingMaster.category, editingMaster.name, masterEditDraft.trim())
    clearEdits()
  }

  const addMaster = () => {
    if (tab === 'questions' || !newItemName.trim()) return
    onAddMasterItem(tab, newItemName.trim())
    setNewItemName('')
  }

  const addQuestion = () => {
    if (!newQuestionText.trim()) return
    onAddMandatoryQuestion(newQuestionText.trim())
    setNewQuestionText('')
  }

  const showOptions =
    editDraft?.type === 'singlechoice' || editDraft?.type === 'multichoice'

  return (
    <Card title="Master Data">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setNewItemName('')
              clearEdits()
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === t.id
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'questions' && (
        <p className="mb-3 text-xs text-slate-500">
          These questions are always included at the start of every assessment. Edit text and
          options below — changes apply immediately to Review and the client portal.
        </p>
      )}

      {tab !== 'questions' ? (
        <>
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {masterData[tab].map((item) => {
              const isEditing =
                editingMaster?.category === tab && editingMaster.name === item
              return (
                <li
                  key={item}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800"
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                        value={masterEditDraft}
                        onChange={(e) => setMasterEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            saveMasterEdit()
                          }
                          if (e.key === 'Escape') clearEdits()
                        }}
                        autoFocus
                      />
                      <div className="flex shrink-0 gap-2">
                        <Button type="button" className="!text-xs" onClick={saveMasterEdit}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!text-xs"
                          onClick={clearEdits}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1">{item}</span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="Edit"
                          className="rounded p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                          onClick={() => startEditMaster(tab, item)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => {
                            if (
                              editingMaster?.category === tab &&
                              editingMaster.name === item
                            ) {
                              clearEdits()
                            }
                            onDeleteMasterItem(tab, item)
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex gap-2">
            <Input
              className="flex-1"
              placeholder={`New ${MASTER_DATA_LABELS[tab].toLowerCase().slice(0, -1)} name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaster())}
            />
            <Button
              type="button"
              className="shrink-0 !bg-slate-800 hover:!bg-slate-900"
              onClick={addMaster}
            >
              Add
            </Button>
          </div>
        </>
      ) : (
        <>
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {mandatoryQuestions.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-amber-200/80 bg-amber-50/30 px-3 py-3 shadow-sm"
              >
                {editingQuestionId === q.id && editDraft ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="amber">Mandatory</Badge>
                    </div>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      rows={2}
                      value={editDraft.text}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, text: e.target.value })
                      }
                    />
                    <Select
                      label="Answer type"
                      value={editDraft.type}
                      onChange={(e) => {
                        const type = e.target.value as MandatoryQuestion['type']
                        setEditDraft({
                          ...editDraft,
                          type,
                          options:
                            type === 'scale' || type === 'text'
                              ? []
                              : editDraft.options.length
                                ? editDraft.options
                                : ['Option 1', 'Option 2'],
                        })
                      }}
                      options={[
                        { value: 'singlechoice', label: 'Single choice' },
                        { value: 'multichoice', label: 'Multiple choice' },
                        { value: 'scale', label: 'Scale (1–10)' },
                        { value: 'text', label: 'Free text' },
                      ]}
                    />
                    {showOptions && editDraft && (
                      <AnswerOptionsEditor
                        questionId={editDraft.id}
                        options={editDraft.options}
                        onChange={(options) =>
                          setEditDraft({
                            ...editDraft,
                            options: stripOtherFromOptions(options),
                          })
                        }
                      />
                    )}
                    <div className="flex gap-2">
                      <Button type="button" className="!text-xs" onClick={saveQuestionEdit}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!text-xs"
                        onClick={clearEdits}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone="amber">Mandatory</Badge>
                        <span className="text-xs text-slate-500">
                          {q.type === 'singlechoice' && 'Single choice'}
                          {q.type === 'multichoice' && 'Multiple choice'}
                          {q.type === 'scale' && 'Scale'}
                          {q.type === 'text' && 'Free text'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{q.text}</p>
                      {q.options.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                          {q.options.map((o) => (
                            <li key={o}>• {o}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        title="Edit question and options"
                        className="rounded p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                        onClick={() => startEditQuestion(q)}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        title="Delete mandatory question"
                        className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => onDeleteMandatoryQuestion(q.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Input
              className="flex-1"
              placeholder="New mandatory question text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
            />
            <Button
              type="button"
              className="shrink-0 !bg-slate-800 hover:!bg-slate-900"
              onClick={addQuestion}
            >
              Add
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
