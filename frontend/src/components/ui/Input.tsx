import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-ink-200 bg-white px-4 py-3',
        'text-base text-ink-950 placeholder:text-ink-400',
        'outline-none transition-all duration-fast ease-out',
        'focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
        'disabled:bg-ink-50 disabled:text-ink-400',
        className
      )}
      style={{ fontSize: '16px', ...style }}
      {...props}
    />
  )
)
Input.displayName = 'Input'
