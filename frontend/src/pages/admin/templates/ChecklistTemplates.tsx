import { useEffect, useState } from 'react'
import { templatesApi } from '../../../utils/api'
import { DEFAULT_CHECKLIST_CATEGORIES, TOTAL_ITEMS } from '../../../constants/checklist'
import type { ChecklistTemplate } from '../../../types'
import { Spinner } from '../../../components/ui/Spinner'
import { cn } from '../../../utils/cn'

export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    templatesApi.list()
      .then(({ data }) => setTemplates(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-24"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Checklist Templates</h1>

      {/* Default template */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Default Snagging Checklist</h2>
            <p className="text-sm text-slate-500">
              {DEFAULT_CHECKLIST_CATEGORIES.length} categories · {TOTAL_ITEMS} items
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Active
          </span>
        </div>
        <div className="space-y-2">
          {DEFAULT_CHECKLIST_CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              className={cn(
                'flex items-center justify-between rounded-xl px-4 py-3',
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
      {templates.filter((t) => !t.isDefault).map((t) => (
        <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">{t.name}</h2>
          <p className="text-sm text-slate-500">{t.categories?.length ?? 0} categories</p>
        </div>
      ))}
    </div>
  )
}
