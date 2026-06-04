import { useEffect, useState } from 'react'
import { templatesApi } from '../../../utils/api'
import { DEFAULT_CHECKLIST_CATEGORIES, TOTAL_ITEMS } from '../../../constants/checklist'
import type { ChecklistTemplate } from '../../../types'

export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])

  useEffect(() => {
    templatesApi.list().then(({ data }) => setTemplates(data))
  }, [])

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Checklist Templates</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Default Template ({TOTAL_ITEMS} items)</h2>
        <p className="text-sm text-slate-500">{DEFAULT_CHECKLIST_CATEGORIES.length} categories</p>
        <ul className="mt-4 space-y-2">
          {DEFAULT_CHECKLIST_CATEGORIES.map((c) => (
            <li key={c.id} className="text-sm">
              {c.name} — {c.items.length} items
            </li>
          ))}
        </ul>
      </div>
      {templates.length > 1 && (
        <div className="mt-4">
          <h3 className="font-semibold">Custom Templates</h3>
          {templates.filter((t) => !t.isDefault).map((t) => (
            <p key={t.id} className="text-sm">
              {t.name}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
