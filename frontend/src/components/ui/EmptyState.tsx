import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

export function EmptyState({
  title,
  description,
  message,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}: {
  title: string
  description?: string
  message?: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  const body = description ?? message
  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center py-16 text-center px-4', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon size={28} aria-hidden />
      </div>
      <h3 className="font-display text-h2 text-ink-800">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-body text-ink-600">{body}</p>}
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
