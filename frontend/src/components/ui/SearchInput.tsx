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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <Input
        className="pl-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
