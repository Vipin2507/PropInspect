import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import { useInspection } from '../../hooks/useInspection'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ROUTES } from '../../constants/routes'

export default function CategorySummary() {
  const { flatId, categoryId } = useParams()
  const navigate = useNavigate()
  const category = DEFAULT_CHECKLIST_CATEGORIES.find((c) => c.id === categoryId)
  const { inspection } = useInspection(flatId)
  const catIndex = DEFAULT_CHECKLIST_CATEGORIES.findIndex((c) => c.id === categoryId)
  const nextCat = DEFAULT_CHECKLIST_CATEGORIES[catIndex + 1]

  if (!category || !inspection) return <p>Loading...</p>

  const responses = inspection.responses.filter((r) => r.categoryId === categoryId)

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <ArrowLeft size={18} /> {category.name} — Summary
      </button>
      <div className="rounded-xl border border-slate-200 bg-white">
        {category.items.map((item, i) => {
          const r = responses.find((x) => x.itemId === item.id)
          return (
            <div key={item.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span>
                {i + 1}. {item.label}
              </span>
              <Badge status={r?.status}>{r?.status || 'pending'}</Badge>
            </div>
          )
        })}
      </div>
      {nextCat && (
        <Button className="mt-6 w-full" onClick={() => navigate(ROUTES.ENGINEER_CHECKLIST(flatId!, nextCat.id))}>
          Next Category →
        </Button>
      )}
    </div>
  )
}
