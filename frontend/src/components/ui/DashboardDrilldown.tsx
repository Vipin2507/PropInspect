import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { StatusBadge } from './Badge'
import { EmptyState } from './EmptyState'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'

export type DrilldownItem = {
  id: string
  title: string
  subtitle?: string
  status?: string
  meta?: string
  href: string
}

export function DashboardDrilldown({
  open,
  title,
  count,
  items,
  onClose,
  emptyTitle = 'No items',
  emptyDescription = 'Nothing matches this filter.',
}: {
  open: boolean
  title: string
  count?: number
  items: DrilldownItem[]
  onClose: () => void
  emptyTitle?: string
  emptyDescription?: string
}) {
  const { reduced } = useMotionSafe()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="dd-backdrop"
            className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-[2px]"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="dd-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex max-h-[78dvh] flex-col',
              'rounded-t-2xl border border-ink-100 bg-surface shadow-lg',
              'md:inset-x-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2'
            )}
            initial={reduced ? false : { y: '105%', opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '105%', opacity: 0.85 }}
            transition={{
              type: 'spring',
              stiffness: 160,
              damping: 26,
              mass: 1,
            }}
          >
            <div className="flex justify-center pt-2.5 pb-1 shrink-0 md:hidden">
              <div className="h-1 w-9 rounded-full bg-ink-200" />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-base font-bold text-ink-950">{title}</h2>
                {count != null && (
                  <p className="text-[11px] tabular text-ink-400">{count} item{count === 1 ? '' : 's'}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 active:bg-ink-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
                aria-label="Close"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
              {items.length === 0 ? (
                <EmptyState title={emptyTitle} description={emptyDescription} className="py-10" />
              ) : (
                <ul>
                  {items.map((item, i) => (
                    <motion.li
                      key={item.id}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 12) * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        to={item.href}
                        onClick={onClose}
                        className="flex min-h-[52px] items-center justify-between gap-3 border-b border-ink-50 px-4 py-3 active:bg-brand-50/70 hover:bg-brand-50/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-800">{item.title}</p>
                          {(item.subtitle || item.meta) && (
                            <p className="truncate text-[11px] text-ink-400">
                              {[item.subtitle, item.meta].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        {item.status && <StatusBadge status={item.status} />}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
