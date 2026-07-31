import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import { Spinner } from './Spinner'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold touch-manipulation',
    'rounded-md transition-all duration-fast ease-out',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
    'active:scale-[0.98]',
    'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-brand-glow',
        secondary:
          'bg-warning-600 text-white shadow-sm hover:brightness-95',
        outline:
          'border border-ink-200 bg-white text-ink-800 shadow-xs hover:border-brand-400 hover:text-brand-600',
        danger: 'bg-danger-600 text-white shadow-sm hover:brightness-95',
        ghost: 'text-ink-600 hover:bg-ink-100',
      },
      size: {
        sm: 'min-h-[44px] px-3 py-2 text-sm',
        md: 'min-h-[44px] px-5 py-2.5 text-body',
        lg: 'min-h-[48px] px-6 py-3 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
