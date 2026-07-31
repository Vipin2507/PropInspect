import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { templatesApi } from '../../../utils/api'
import { getTemplatesFromDb, saveTemplates } from '../../../utils/storage'
import { DEFAULT_CHECKLIST_CATEGORIES, TOTAL_ITEMS } from '../../../constants/checklist'
import type { ChecklistTemplate } from '../../../types'
import { Spinner } from '../../../components/ui/Spinner'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useMotionSafe } from '../../../hooks/useMotionSafe'
import { cn } from '../../../utils/cn'
import {
  Pencil, Plus, Trash2, ChevronDown, Camera, ClipboardList,
  Layers, CheckCircle, Search, MoreHorizontal,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import toast from 'react-hot-toast'
import { generateId } from '../../../utils/id'

const uid = () => generateId().slice(0, 8)
const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

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

function TemplateEditor({
  initialName,
  initialCategories,
  onSave,
  onClose,
  templateId,
}: {
  initialName: string
  initialCategories: EditCategory[]
  onSave: () => void
  onClose: () => void
  templateId?: string
}) {
  const { reduced } = useMotionSafe()
  const [name, setName] = useState(initialName)
  const [categories, setCategories] = useState<EditCategory[]>(initialCategories)
  const [expanded, setExpanded] = useState<string | null>(initialCategories[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const toggleExpand = (id: string) => setExpanded((prev) => (prev === id ? null : id))

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
              items: [...c.items, { id: `item_${uid()}`, label: '', isMandatoryImage: false }],
            }
          : c
      )
    )

  const updateCatName = (catId: string, val: string) =>
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, name: val } : c)))

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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }
    for (const c of categories) {
      if (!c.name.trim()) {
        toast.error('Category name cannot be empty')
        return
      }
      for (const i of c.items) {
        if (!i.label.trim()) {
          toast.error(`Item label cannot be empty in "${c.name}"`)
          return
        }
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

      if (templateId) {
        await templatesApi.update(templateId, { name, sections: sections as never })
      } else {
        await templatesApi.create({ name, sections: sections as never })
      }
      toast.success(templateId ? 'Template updated' : 'Template created')
      onSave()
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={fieldLabel}>Template name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Finishing Inspection"
        />
      </div>

      <p className="text-[11px] text-ink-400">
        {categories.length} categories · {totalItems} items
      </p>

      <div className="space-y-1.5">
        {categories.map((cat) => {
          const open = expanded === cat.id
          return (
            <div
              key={cat.id}
              className="overflow-hidden rounded-md border border-ink-100 bg-surface"
            >
              <div className="flex items-center gap-1 bg-ink-50/80 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => toggleExpand(cat.id)}
                  className="flex min-h-[36px] flex-1 touch-manipulation items-center gap-2 text-left"
                >
                  <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.28, ease: easeOut }}
                    className="shrink-0 text-ink-400"
                  >
                    <ChevronDown size={14} aria-hidden />
                  </motion.span>
                  <span className="flex-1 truncate text-sm font-semibold text-ink-800">
                    {cat.name || 'Unnamed category'}
                  </span>
                  <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                    {cat.items.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeCat(cat.id)}
                  className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-md text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  aria-label="Remove category"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="body"
                    initial={reduced ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduced ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 px-2.5 pb-2.5 pt-2">
                      <Input
                        value={cat.name}
                        onChange={(e) => updateCatName(cat.id, e.target.value)}
                        placeholder="Category name"
                        className="text-sm"
                      />

                      {cat.items.length === 0 && (
                        <p className="py-1.5 text-center text-[11px] text-ink-400">No items yet</p>
                      )}

                      <div className="space-y-1.5">
                        {cat.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(cat.id, item.id, {
                                  isMandatoryImage: !item.isMandatoryImage,
                                })
                              }
                              className={cn(
                                'flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-md transition-colors',
                                item.isMandatoryImage
                                  ? 'bg-brand-100 text-brand-600'
                                  : 'text-ink-300 hover:bg-ink-50'
                              )}
                              title={
                                item.isMandatoryImage
                                  ? 'Photo required (tap to toggle)'
                                  : 'Photo optional'
                              }
                              aria-label="Toggle mandatory photo"
                            >
                              <Camera size={14} aria-hidden />
                            </button>

                            <Input
                              value={item.label}
                              onChange={(e) =>
                                updateItem(cat.id, item.id, { label: e.target.value })
                              }
                              placeholder="Item label"
                              className="flex-1 text-sm"
                            />

                            <button
                              type="button"
                              onClick={() => removeItem(cat.id, item.id)}
                              className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-md text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addItem(cat.id)}
                        className="flex w-full touch-manipulation items-center justify-center gap-1.5 rounded-md border border-dashed border-ink-200 py-2 text-xs font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-600"
                      >
                        <Plus size={13} aria-hidden /> Add item
                      </button>

                      <p className="flex items-center gap-1 text-[10px] text-ink-400">
                        <Camera size={10} aria-hidden />
                        Blue camera = photo required on Fail
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {addingCat ? (
        <div className="flex gap-2">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCategory()
            }}
            className="flex-1"
          />
          <Button size="sm" className={compactBtn} onClick={addCategory} disabled={!newCatName.trim()}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={compactBtn}
            onClick={() => setAddingCat(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingCat(true)}
          className="flex w-full touch-manipulation items-center justify-center gap-1.5 rounded-md border border-dashed border-ink-200 py-2.5 text-xs font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-600"
        >
          <Plus size={14} aria-hidden /> Add category
        </button>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} className="flex-1">
          {templateId ? 'Save changes' : 'Create template'}
        </Button>
      </div>
    </div>
  )
}

export default function ChecklistTemplates() {
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<ChecklistTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [defaultOpen, setDefaultOpen] = useState(false)

  const load = async () => {
    setLoading(true)

    try {
      const cached = await getTemplatesFromDb()
      if (cached.length > 0) {
        setTemplates(cached as unknown as ChecklistTemplate[])
        setLoading(false)
      }
    } catch {
      /* ignore */
    }

    try {
      const { data } = await templatesApi.list()
      await saveTemplates(data as unknown as Record<string, unknown>[])
      setTemplates(data)
    } catch {
      // keep cached
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const customTemplates = useMemo(
    () => templates.filter((t) => !t.isDefault),
    [templates]
  )

  const filteredCustom = useMemo(() => {
    if (!search.trim()) return customTemplates
    const q = search.toLowerCase()
    return customTemplates.filter((t) => t.name.toLowerCase().includes(q))
  }, [customTemplates, search])

  if (loading && templates.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div className="space-y-3 pb-4" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Templates</h1>
          <p className="text-[11px] text-ink-400">
            {customTemplates.length} custom · 1 built-in
          </p>
        </div>
        <Button size="sm" className={compactBtn} onClick={() => setCreateOpen(true)}>
          <Plus size={14} aria-hidden />
          <span className="sm:hidden">New</span>
          <span className="hidden sm:inline">New Template</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          index={0}
          label="Built-in"
          value={1}
          icon={CheckCircle}
          colorClass="text-success-600 bg-success-100"
        />
        <StatCard
          index={1}
          label="Custom"
          value={customTemplates.length}
          icon={Layers}
          colorClass="text-brand-600 bg-brand-100"
        />
        <StatCard
          index={2}
          label="Default items"
          value={TOTAL_ITEMS}
          icon={ClipboardList}
          colorClass="text-ink-600 bg-ink-100"
        />
      </div>

      {/* Default template */}
      <Card className="overflow-hidden p-0 shadow-xs">
        <button
          type="button"
          onClick={() => setDefaultOpen((p) => !p)}
          className="flex w-full items-center gap-2.5 p-3 text-left touch-manipulation"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-600">
            <ClipboardList size={16} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-ink-950">
                Default Snagging Checklist
              </p>
              <span className="shrink-0 rounded-md bg-success-100 px-1.5 py-0.5 text-[10px] font-bold text-success-700">
                Active
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {DEFAULT_CHECKLIST_CATEGORIES.length} categories · {TOTAL_ITEMS} items · built-in
            </p>
          </div>
          <motion.span
            animate={{ rotate: defaultOpen ? 180 : 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
            className="shrink-0 text-ink-300"
          >
            <ChevronDown size={16} aria-hidden />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {defaultOpen && (
            <motion.div
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduced ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.36, ease: easeOut }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5 border-t border-ink-50 px-3 pb-3 pt-1">
                {DEFAULT_CHECKLIST_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-ink-50/80"
                  >
                    <span className="text-xs font-medium text-ink-700">{cat.name}</span>
                    <span className="text-[10px] font-semibold text-ink-400">
                      {cat.items.length} items
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search custom templates…"
          className="w-full min-h-[40px] rounded-md border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm text-ink-950 outline-none transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          style={{ fontSize: '16px' }}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {filteredCustom.length === 0 ? (
          <motion.div
            key="empty"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.32, ease: easeOut }}
          >
            <EmptyState
              icon={Layers}
              title={customTemplates.length === 0 ? 'No custom templates' : 'No matches'}
              description={
                customTemplates.length === 0
                  ? 'Create a template tailored to your project.'
                  : 'Try a different search.'
              }
              actionLabel={customTemplates.length === 0 ? 'New Template' : undefined}
              onAction={customTemplates.length === 0 ? () => setCreateOpen(true) : undefined}
              className="py-10"
            />
          </motion.div>
        ) : (
          <motion.div
            key={`list-${search}`}
            className="grid grid-cols-1 gap-2 md:grid-cols-2"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            {filteredCustom.map((t, i) => {
              const cats = (t.categories ?? []) as {
                id?: string
                name: string
                items?: unknown[]
              }[]
              const itemCount = cats.reduce((s, c) => s + (c.items?.length ?? 0), 0)

              return (
                <motion.div
                  key={t.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={stagger(Math.min(i, 12))}
                >
                  <Card className="overflow-hidden p-0 shadow-xs">
                    <div className="flex items-start gap-2.5 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                        <Layers size={16} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-950">{t.name}</p>
                            <p className="mt-0.5 text-[11px] text-ink-400">
                              {cats.length} categories · {itemCount} items
                            </p>
                          </div>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button
                                type="button"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                                aria-label={`Actions for ${t.name}`}
                              >
                                <MoreHorizontal size={16} aria-hidden />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                align="end"
                                sideOffset={4}
                                className="z-50 min-w-[140px] overflow-hidden rounded-lg border border-ink-100 bg-surface p-1 shadow-md"
                              >
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-ink-700 outline-none data-[highlighted]:bg-ink-50"
                                  onSelect={() => setEditTarget(t)}
                                >
                                  <Pencil size={13} aria-hidden /> Edit
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>

                        {cats.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {cats.slice(0, 4).map((c, ci) => (
                              <div
                                key={c.id ?? ci}
                                className="flex items-center justify-between rounded-md px-1.5 py-1 text-[11px]"
                              >
                                <span className="truncate text-ink-600">{c.name}</span>
                                <span className="shrink-0 text-ink-400">
                                  {c.items?.length ?? 0}
                                </span>
                              </div>
                            ))}
                            {cats.length > 4 && (
                              <p className="px-1.5 text-[10px] text-ink-400">
                                +{cats.length - 4} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false)
        }}
        title="New Checklist Template"
      >
        <TemplateEditor
          initialName=""
          initialCategories={[]}
          onSave={() => {
            setCreateOpen(false)
            load()
          }}
          onClose={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        title={`Edit: ${editTarget?.name ?? ''}`}
      >
        {editTarget && (
          <TemplateEditor
            templateId={editTarget.id}
            initialName={editTarget.name}
            initialCategories={(editTarget.categories ?? []).map((c) => {
              const cat = c as {
                id: string
                name: string
                icon?: string
                sortOrder?: number
                items?: { id: string; label: string; isMandatoryImage?: boolean }[]
              }
              return {
                id: cat.id,
                name: cat.name,
                icon: cat.icon || 'ClipboardList',
                sortOrder: cat.sortOrder ?? 0,
                items: (cat.items ?? []).map((i) => ({
                  id: i.id,
                  label: i.label,
                  isMandatoryImage: Boolean(i.isMandatoryImage),
                })),
              }
            })}
            onSave={() => {
              setEditTarget(null)
              load()
            }}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>
    </motion.div>
  )
}
