import { cn } from '../../utils/cn'

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12' }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  if (src) return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size])} />
  return (
    <div className={cn('flex items-center justify-center rounded-full bg-primary font-semibold text-white', sizes[size])}>
      {initials}
    </div>
  )
}
