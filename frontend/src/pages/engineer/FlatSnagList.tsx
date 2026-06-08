import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronRight, Wrench } from 'lucide-react'
import { useSnags } from '../../hooks/useSnags'
import { flatsApi } from '../../utils/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ROUTES } from '../../constants/routes'
import type { Flat } from '../../types'

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-fail',
  major:    'text-orange-500',
  minor:    'text-yellow-600',
}

export default function FlatSnagList() {
  const { flatId } = useParams<{ flatId: string }>()
  const navigate = useNavigate()
  const [flat, setFlat] = useState<Flat | null>(null)
  const { snags, loading } = useSnags({ flatId })

  useEffect(() => {
    if (flatId) flatsApi.get(flatId).then(({ data }) => setFlat(data))
  }, [flatId])

  const openSnags = snags.filter((s) =>
    ['open', 'assigned', 'in_rectification'].includes(s.status)
  )
  const otherSnags = snags.filter((s) =>
    !['open', 'assigned', 'in_rectification'].includes(s.status)
  )

  const firstOpen = openSnags[0]

  return (
    <div className="flex flex-col gap-4 pb-28 md:pb-6">
      <Link
        to={ROUTES.ENGINEER_FLAT(flatId!)}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 active:text-primary touch-manipulation"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Flat
      </Link>

      {/* Header */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          {flat?.flatNumber || '—'} · Snags
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {flat?.towerName} · {flat?.floorLabel}
        </p>
        {!loading && (
          <div className="mt-3 flex gap-3 text-sm">
            <span className="font-semibold text-fail">
              {openSnags.length} open
            </span>
            {otherSnags.length > 0 && (
              <span className="text-slate-400">
                {otherSnags.length} resolved
              </span>
            )}
          </div>
        )}
      </div>

      {loading && snags.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : snags.length === 0 ? (
        <EmptyState
          title="No Snags"
          description="No snags have been raised for this flat."
        />
      ) : (
        <>
          {/* Open snags */}
          {openSnags.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Open · {openSnags.length}
              </h2>
              <div className="space-y-2">
                {openSnags.map((snag, i) => (
                  <button
                    key={snag.id}
                    type="button"
                    onClick={() => navigate(ROUTES.DESNAGGING_DETAIL(snag.id))}
                    className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-white p-4 text-left shadow-sm touch-manipulation active:bg-red-50 active:scale-[0.99] transition-transform min-h-[64px]"
                  >
                    {/* Number badge */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-fail">
                      {i + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 leading-snug">{snag.itemLabel}</p>
                      {snag.description && (
                        <p className="mt-0.5 truncate text-sm text-slate-500">{snag.description}</p>
                      )}
                      {snag.severity && (
                        <p className={`mt-0.5 text-xs font-semibold capitalize ${SEVERITY_COLOR[snag.severity] || 'text-slate-500'}`}>
                          {snag.severity}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge status={snag.status} />
                      <ChevronRight size={16} className="text-slate-300" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Resolved snags */}
          {otherSnags.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Resolved · {otherSnags.length}
              </h2>
              <div className="space-y-2">
                {otherSnags.map((snag) => (
                  <button
                    key={snag.id}
                    type="button"
                    onClick={() => navigate(ROUTES.DESNAGGING_DETAIL(snag.id))}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm touch-manipulation active:bg-slate-50 active:scale-[0.99] transition-transform min-h-[64px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-700 leading-snug">{snag.itemLabel}</p>
                      {snag.description && (
                        <p className="mt-0.5 truncate text-sm text-slate-400">{snag.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge status={snag.status} />
                      <ChevronRight size={16} className="text-slate-300" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Fixed CTA — Start De-Snagging */}
      {!loading && firstOpen && (
        <div className={[
          'fixed bottom-0 left-0 right-0 z-30',
          'border-t border-slate-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-sm',
          'md:relative md:bottom-auto md:left-auto md:right-auto md:border-none md:bg-transparent md:p-0',
        ].join(' ')}>
          <Button
            className="mx-auto w-full max-w-md"
            onClick={() => navigate(ROUTES.DESNAGGING_DETAIL(firstOpen.id))}
          >
            <Wrench size={18} aria-hidden="true" />
            Start De-Snagging
          </Button>
        </div>
      )}
    </div>
  )
}
