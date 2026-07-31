import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-ink-200 bg-white px-4 py-3',
        'text-base text-ink-950 placeholder:text-ink-400',
        'outline-none transition-all duration-fast ease-out resize-none',
        'focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
        'disabled:bg-ink-50 disabled:text-ink-400',
        className
      )}
      style={{ fontSize: '16px', ...style }}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
