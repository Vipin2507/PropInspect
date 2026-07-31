import { Search } from 'lucide-react'
import { Input } from './Input'
import { cn } from '../../utils/cn'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
        size={18}
        aria-hidden="true"
      />
      <Input
        className="pl-11 focus:ring-4 focus:ring-brand-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
