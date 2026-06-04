import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-dark',
      secondary: 'bg-secondary text-white hover:bg-secondary-dark',
      outline: 'border border-slate-200 bg-white text-slate-700 hover:border-primary',
      danger: 'bg-fail text-white hover:bg-red-700',
      ghost: 'text-slate-600 hover:bg-slate-100',
    }
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' }
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[0.97] disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
