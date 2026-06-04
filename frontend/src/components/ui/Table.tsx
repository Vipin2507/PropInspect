import { cn } from '../../utils/cn'

export function Table({
  children,
  className,
  mobileCardLayout,
}: {
  children: React.ReactNode
  className?: string
  mobileCardLayout?: (item: any) => React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="hidden md:block overflow-x-auto">
        <table className={cn('w-full text-left text-sm', className)}>
          {children}
        </table>
      </div>
      {mobileCardLayout && (
        <div className="md:hidden">
          {/* This part will be handled by the page component */}
        </div>
      )}
    </div>
  )
}

export function TableMobileCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const isClickable = !!onClick
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        isClickable && 'cursor-pointer active:bg-slate-50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function TableMobileRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="min-w-0 text-right text-sm font-medium text-slate-800">
        {children}
      </div>
    </div>
  )
}

export function Th({
  children,
  className,
  isMobileHidden,
}: {
  children?: React.ReactNode
  className?: string
  isMobileHidden?: boolean
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600',
        isMobileHidden && 'hidden md:table-cell',
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  isMobileHidden,
}: {
  children?: React.ReactNode
  className?: string
  isMobileHidden?: boolean
}) {
  return (
    <td
      className={cn(
        'whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700',
        isMobileHidden && 'hidden md:table-cell',
        className
      )}
    >
      {children}
    </td>
  )
}
