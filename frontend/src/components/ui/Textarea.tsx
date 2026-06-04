import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
