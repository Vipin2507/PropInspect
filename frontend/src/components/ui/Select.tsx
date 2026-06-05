import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-3',
        'text-base text-slate-900',
        'outline-none transition appearance-none',
        'focus:border-primary focus:ring-2 focus:ring-primary-light',
        'disabled:bg-slate-50 disabled:text-slate-400',
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
