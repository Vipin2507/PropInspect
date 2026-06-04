import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  onImageAdd: (responseId: string, file: File, preview: string) => void
  onImageRemove: (responseId: string, imageId: string) => void
  readOnly?: boolean
}) {
  const [isOpen, setIsOpen] = useState(true)
  const doneCount = responses.filter((r) => r.status !== 'pending').length
  const totalCount = category.items.length
  const Icon =
    (Icons as any)[category.icon] || Icons.HelpCircle

  const isComplete = doneCount === totalCount
  
  // Use more distinct colors for states
  const headerStyles = isComplete
    ? 'bg-green-100 text-green-800'
    : doneCount > 0
    ? 'bg-blue-100 text-blue-800'
    : 'bg-slate-100 text-slate-700'

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-4 px-4 py-4 text-left font-semibold transition-colors',
          headerStyles
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <Icon size={22} className="shrink-0" />
        <span className="flex-1 text-base">{category.name}</span>
        <span className="text-sm font-medium">
          {doneCount}/{totalCount}
        </span>
        <ChevronDown
          size={22}
          className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      {isOpen && (
        <div className="divide-y divide-slate-100">
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
                onImageAdd={(file, preview) =>
                  onImageAdd(response.id, file, preview)
                }
                onImageRemove={(id) => onImageRemove(response.id, id)}
                readOnly={readOnly}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
