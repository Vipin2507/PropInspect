import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-ink-200 bg-white px-3 py-2',
        'min-h-[40px] text-sm text-ink-950',
        'outline-none transition-all duration-fast ease-out appearance-none',
        'focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
        'disabled:bg-ink-50 disabled:text-ink-400',
        className
      )}
      style={{ fontSize: '16px', ...style }}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'
