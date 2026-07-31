import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-ink-100/80 bg-surface shadow-sm',
        interactive &&
          'transition-all duration-base ease-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer touch-manipulation',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Card.displayName = 'Card'
