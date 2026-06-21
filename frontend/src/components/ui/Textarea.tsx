import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-3',
        'text-base text-slate-900 placeholder:text-slate-400',
        'outline-none transition resize-none',
        'focus:border-primary focus:ring-2 focus:ring-primary-light',
        'disabled:bg-slate-50 disabled:text-slate-400',
        className
      )}
      style={{ fontSize: '16px', ...style }}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
