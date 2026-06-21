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
      primary:   'bg-primary text-white active:bg-primary-dark',
      secondary: 'bg-secondary text-white active:bg-secondary-dark',
      outline:   'border border-slate-200 bg-white text-slate-700 active:border-primary active:bg-primary-light',
      danger:    'bg-fail text-white active:bg-red-700',
      ghost:     'text-slate-600 active:bg-slate-100',
    }
    // md is the default touch-safe size; sm still keeps 44px tap target via min-h
    const sizes = {
      sm: 'min-h-[44px] px-3 py-2 text-sm',
      md: 'min-h-[48px] px-5 py-3 text-base',
      lg: 'min-h-[52px] px-6 py-3.5 text-lg',
    }
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
          'touch-manipulation transition-transform duration-150',
          'active:scale-[0.97]',
          'disabled:opacity-50 disabled:pointer-events-none',
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
