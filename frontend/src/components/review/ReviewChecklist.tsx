import { DEFAULT_CHECKLIST_CATEGORIES } from '../../constants/checklist'
import { ReviewItemRow } from './ReviewItemRow'
import type { InspectionResponse } from '../../types'
import * as Icons from 'lucide-react'

export function ReviewChecklist({
  responses,
  itemComments,
  onItemCommentChange,
  onImageClick,
}: {
  responses: InspectionResponse[]
  itemComments: Record<string, string>
  onItemCommentChange: (itemId: string, v: string) => void
  onImageClick: (url: string) => void
}) {
  return (
    <div className="space-y-6">
      {DEFAULT_CHECKLIST_CATEGORIES.map((cat) => {
        const Icon = (Icons as any)[cat.icon] || Icons.HelpCircle
        return (
          <div key={cat.id} className="rounded-xl bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Icon className="text-primary" size={22} />
              <h3 className="text-lg font-bold text-slate-900">{cat.name}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {cat.items.map((item, i) => {
                const response = responses.find((r) => r.itemId === item.id)
                if (!response) return null
                return (
                  <ReviewItemRow
                    key={item.id}
                    index={i + 1}
                    label={item.label}
                    response={response}
                    qaComment={itemComments[response.id] || response.qaRemarks || ''}
                    onQaComment={(v) => onItemCommentChange(response.id, v)}
                    onImageClick={onImageClick}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
