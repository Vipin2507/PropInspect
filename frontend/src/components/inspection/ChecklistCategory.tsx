import * as Icons from 'lucide-react'
import { cn } from '../../utils/cn'
import { ChecklistItem } from './ChecklistItem'
import type { InspectionResponse } from '../../types'

export function ChecklistCategory({
  category,
  responses,
  onChange,
  onImageAdd,
  onImageRemove,
  readOnly,
}: {
  category: {
    id: string
    name: string
    icon: string
    items: { id: string; label: string; isMandatoryImage: boolean }[]
  }
  responses: InspectionResponse[]
  onChange: (itemId: string, patch: Partial<InspectionResponse>) => void
  onImageAdd: (responseId: string, file: File, base64: string) => void
  onImageRemove: (responseId: string, imageId: string) => void
  readOnly?: boolean
}) {
  const doneCount  = responses.filter((r) => r.status !== 'pending').length
  const totalCount = category.items.length
  const allDone    = doneCount === totalCount && totalCount > 0
  const Icon = (Icons as any)[category.icon] || Icons.HelpCircle

  return (
    <div className="space-y-3">
      {category.items.map((item, i) => {
        const response = responses.find((r) => r.itemId === item.id)
        if (!response) return null
        return (
          <ChecklistItem
            key={item.id}
            index={i + 1}
            label={item.label}
            isMandatoryImage={item.isMandatoryImage}
            response={response}
            onChange={(patch) => onChange(item.id, patch)}
            onImageAdd={(file, base64) => onImageAdd(response.id, file, base64)}
            onImageRemove={(id) => onImageRemove(response.id, id)}
            readOnly={readOnly}
          />
        )
      })}
    </div>
  )
}
