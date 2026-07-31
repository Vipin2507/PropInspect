import { cn } from '../../utils/cn'

type Role = 'engineer' | 'qa' | 'admin' | 'viewer' | string

const roleDot: Record<string, string> = {
  engineer: 'bg-[var(--role-engineer)]',
  qa: 'bg-[var(--role-qa)]',
  admin: 'bg-[var(--role-admin)]',
  viewer: 'bg-ink-400',
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-[72px] w-[72px] text-xl',
}

export function Avatar({
  name,
  src,
  size = 'md',
  role,
  className,
}: {
  name: string
  src?: string
  size?: keyof typeof sizes
  role?: Role
  className?: string
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover ring-2 ring-white', sizes[size])}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white ring-2 ring-white',
            sizes[size]
          )}
          aria-hidden={!name}
        >
          {initials}
        </div>
      )}
      {role && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white',
            roleDot[role] ?? 'bg-ink-400'
          )}
          title={role}
          aria-hidden
        />
      )}
    </div>
  )
}
