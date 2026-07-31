import { ChecklistItem } from './ChecklistItem'
import { motion } from 'framer-motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'
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
  const { reduced, stagger } = useMotionSafe()

  return (
    <div className="space-y-1.5">
      {category.items.map((item, i) => {
        const response = responses.find((r) => r.itemId === item.id)
        if (!response) return null
        return (
          <motion.div
            key={item.id}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(Math.min(i, 10))}
          >
            <ChecklistItem
              index={i + 1}
              label={item.label}
              isMandatoryImage={item.isMandatoryImage}
              response={response}
              onChange={(patch) => onChange(item.id, patch)}
              onImageAdd={(file, base64) => onImageAdd(response.id, file, base64)}
              onImageRemove={(id) => onImageRemove(response.id, id)}
              readOnly={readOnly}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
