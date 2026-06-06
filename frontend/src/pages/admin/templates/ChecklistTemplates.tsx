import { useEffect, useState } from 'react'
import { templatesApi } from '../../../utils/api'
import { DEFAULT_CHECKLIST_CATEGORIES, TOTAL_ITEMS } from '../../../constants/checklist'
import type { ChecklistTemplate } from '../../../types'
import { Spinner } from '../../../components/ui/Spinner'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../utils/cn'
import {
  Pencil, Plus, Trash2, ChevronDown, ChevronUp, Camera,
} from 'lucide-react'
import toast from 'react-hot-toast'

const uid = () => crypto.randomUUID().slice(0, 8)

// ── Types ────────────────────────────────────────────────────────────────────
interface EditItem {
  id: string
  label: string
  isMandatoryImage: boolean
}
interface EditCategory {
  id: string
  name: string
  icon: string
  sortOrder: number
  items: EditItem[]
}

// ── Template Editor Modal ────────────────────────────────────────────────────
function TemplateEditor({
  template,
  onSave,
  onClose,
}: {
  template: ChecklistTemplate
  onSave: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(template.name)
  const [categories, setCategories] = useState<EditCategory[]>(() =>
    (template.categories ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || 'ClipboardList',
      sortOrder: c.sortOrder ?? 0,
      items: (c.items ?? []).map((i: any) => ({
        id: i.id,
        label: i.label,
        isMandatoryImage: Boolean(i.isMandatoryImage),
      })),
    }))
  )
  const [expanded, setExpanded] = useState<string | null>(categories[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const toggleExpand = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id))

  // ── Item operations ──────────────────────────────────────────────────────
  const updateItem = (catId: string, itemId: string, patch: Partial<EditItem>) =>
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
          : c
      )
    )

  const removeItem = (catId: string, itemId: string) =>
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      )
    )

  const addItem = (catId: string) =>
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: [
                ...c.items,
                { id: `item_${uid()}`, label: '', isMandatoryImage: false },
              ],
            }
          : c
      )
    )

  // ── Category operations ─────────────────────────────────────────────────
  const updateCatName = (catId: string, val: string) =>
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name: val } : c))
    )

  const removeCat = (catId: string) =>
    setCategories((prev) => prev.filter((c) => c.id !== catId))

  const addCategory = () => {
    const n = newCatName.trim()
    if (!n) return
    const id = `cat_${uid()}`
    setCategories((prev) => [
      ...prev,
      { id, name: n, icon: 'ClipboardList', sortOrder: prev.length, items: [] },
    ])
    setExpanded(id)
    setNewCatName('')
    setAddingCat(false)
  }

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { toast.error('Template name is required'); return }
    for (const c of categories) {
      if (!c.name.trim()) { toast.error(`Category name cannot be empty`); return }
      for (const i of c.items) {
        if (!i.label.trim()) { toast.error(`Item label cannot be empty in "${c.name}"`); return }
      }
    }
    setSaving(true)
    try {
      const sections = categories.map((c, idx) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        sortOrder: idx,
        items: c.items.map((i, iIdx) => ({
          id: i.id,
          label: i.label,
          isMandatoryImage: i.isMandatoryImage,
          sortOrder: iIdx,
        })),
      }))
      await templatesApi.update(template.id, { name, sections: sections as any })
      toast.success('Template saved')
      onSave()
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Template name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Template Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
      </div>

      <p className="text-xs text-slate-500">
        {categories.length} categories · {totalItems} items
      </p>

      {/* Category list */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Category header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50">
              <button
                type="button"
                onClick={() => toggleExpand(cat.id)}
                className="flex flex-1 items-center gap-2 touch-manipulation text-left min-h-[40px]"
              >
                {expanded === cat.id
                  ? <ChevronUp size={16} className="shrink-0 text-slate-400" />
                  : <ChevronDown size={16} className="shrink-0 text-slate-400" />
                }
                <span className="flex-1 text-sm font-semibold text-slate-800 truncate">
                  {cat.name || 'Unnamed category'}
                </span>
                <span className="text-xs text-slate-400">{cat.items.length} items</span>
              </button>
              <button
                type="button"
                onClick={() => removeCat(cat.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 active:bg-red-50 active:text-fail touch-manipulation"
                aria-label="Remove category"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>

            {/* Expanded: category name edit + items */}
            {expanded === cat.id && (
              <div className="px-3 pb-3 pt-2 space-y-3">
                {/* Category name input */}
                <Input
                  value={cat.name}
                  onChange={(e) => updateCatName(cat.id, e.target.value)}
                  placeholder="Category name"
                  className="text-sm"
                />

                {/* Items */}
                {cat.items.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-2">No items yet</p>
                )}
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {/* Mandatory image toggle */}
                      <button
                        type="button"
                        onClick={() => updateItem(cat.id, item.id, { isMandatoryImage: !item.isMandatoryImage })}
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg touch-manipulation transition-colors',
                          item.isMandatoryImage
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-300 active:bg-slate-100'
                        )}
                        title={item.isMandatoryImage ? 'Photo required (tap to toggle)' : 'Photo optional (tap to make required)'}
                        aria-label="Toggle mandatory photo"
                      >
                        <Camera size={16} aria-hidden="true" />
                      </button>

                      {/* Label input */}
                      <Input
                        value={item.label}
                        onChange={(e) => updateItem(cat.id, item.id, { label: e.target.value })}
                        placeholder="Item label"
                        className="flex-1 text-sm"
                      />

                      {/* Remove item */}
                      <button
                        type="button"
                        onClick={() => removeItem(cat.id, item.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 active:bg-red-50 active:text-fail touch-manipulation"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add item */}
                <button
                  type="button"
                  onClick={() => addItem(cat.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-500 active:border-primary active:text-primary touch-manipulation"
                >
                  <Plus size={15} aria-hidden="true" />
                  Add Item
                </button>

                {/* Legend */}
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Camera size={11} aria-hidden="true" />
                  Blue camera = photo required on Fail
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add category */}
      {addingCat ? (
        <div className="flex gap-2">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory() }}
            className="flex-1"
          />
          <Button size="sm" onClick={addCategory} disabled={!newCatName.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingCat(false)}>Cancel</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingCat(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 active:border-primary active:text-primary touch-manipulation"
        >
          <Plus size={16} aria-hidden="true" />
          Add Category
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} loading={saving} className="flex-1">Save Template</Button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<ChecklistTemplate | null>(null)

  const load = () => {
    setLoading(true)
    templatesApi.list()
      .then(({ data }) => setTemplates(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-24"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Checklist Templates</h1>

      {/* Default template (read-only display) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Default Snagging Checklist</h2>
            <p className="text-sm text-slate-500">
              {DEFAULT_CHECKLIST_CATEGORIES.length} categories · {TOTAL_ITEMS} items · built-in
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Active
          </span>
        </div>
        <div className="space-y-1.5">
          {DEFAULT_CHECKLIST_CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              className={cn(
                'flex items-center justify-between rounded-xl px-4 py-2.5',
                i % 2 === 0 ? 'bg-slate-50' : 'bg-white'
              )}
            >
              <span className="text-sm font-medium text-slate-700">{cat.name}</span>
              <span className="text-sm text-slate-400">{cat.items.length} items</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom templates */}
      {templates.filter((t) => !t.isDefault).length === 0 && (
        <p className="text-center text-sm text-slate-400 py-4">No custom templates yet.</p>
      )}

      {templates.filter((t) => !t.isDefault).map((t) => (
        <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-800">{t.name}</h2>
              <p className="text-sm text-slate-500">
                {t.categories?.length ?? 0} categories ·{' '}
                {(t.categories ?? []).reduce((s: number, c: any) => s + (c.items?.length ?? 0), 0)} items
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(t)}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </Button>
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      <Modal
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        title={`Edit: ${editTarget?.name ?? ''}`}
      >
        {editTarget && (
          <TemplateEditor
            template={editTarget}
            onSave={() => { setEditTarget(null); load() }}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>
    </div>
  )
}
