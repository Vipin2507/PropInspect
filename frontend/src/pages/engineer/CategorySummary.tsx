import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import { useInspection } from '../../hooks/useInspection'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { ROUTES } from '../../constants/routes'

export default function CategorySummary() {
  const { flatId, categoryId } = useParams()
  const navigate  = useNavigate()
  const category  = DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === categoryId)
  const catIndex  = DEFAULT_CHECKLIST_CATEGORIES.findIndex((c) => c.id === categoryId)
  const nextCat   = DEFAULT_CHECKLIST_CATEGORIES[catIndex + 1]
  const { inspection } = useInspection(flatId)

  if (!category || !inspection) {
    return <div className="flex flex-1 items-center justify-center py-24"><Spinner size="lg" /></div>
  }

  const responses = inspection.responses.filter((r) => r.categoryId === categoryId)

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        {category.name} — Summary
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {category.items.map((item, i) => {
          const r = responses.find((x) => x.itemId === item.id)
          return (
            <div
              key={item.id}
              className="flex min-h-[56px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
            >
              <span className="text-sm text-slate-700 leading-snug">
                {i + 1}. {item.label}
              </span>
              <Badge status={r?.status ?? 'pending'} />
            </div>
          )
        })}
      </div>

      {nextCat && (
        <Button
          className="w-full"
          onClick={() => navigate(ROUTES.ENGINEER_CHECKLIST(flatId!, nextCat.id))}
        >
          Next: {nextCat.name} →
        </Button>
      )}
    </div>
  )
}
