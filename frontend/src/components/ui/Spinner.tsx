import { cn } from '../../utils/cn'

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-slate-200 border-t-primary', sizes[size], className)}
    />
  )
}
