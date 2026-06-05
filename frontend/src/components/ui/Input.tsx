import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-3',
        'text-base text-slate-900 placeholder:text-slate-400',
        'outline-none transition',
        'focus:border-primary focus:ring-2 focus:ring-primary-light',
        'disabled:bg-slate-50 disabled:text-slate-400',
        className
      )}
      // Hardcoded 16px prevents Android/iOS zoom on focus
      style={{ fontSize: '16px', ...style }}
      {...props}
    />
  )
)
Input.displayName = 'Input'
