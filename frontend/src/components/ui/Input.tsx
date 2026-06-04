import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
