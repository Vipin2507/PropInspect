import { useState, useEffect, useMemo } from 'react'
import { useSnags } from '../../hooks/useSnags'
import { useFlats } from '../../hooks/useFlats'
import { SnagCard } from '../../components/desnagging/SnagCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { useProjects } from '../../hooks/useProjects'
import { FilterBar } from '../../components/ui/FilterBar'
import { Spinner } from '../../components/ui/Spinner'

const STATUS_OPTIONS = [
  { value: 'all',              label: 'All Statuses' },
  { value: 'open',             label: 'Open' },
  { value: 'assigned',         label: 'Assigned' },
  { value: 'in_rectification', label: 'In Rectification' },
  { value: 'rectified',        label: 'Rectified' },
  { value: 'closed',           label: 'Closed' },
]

export default function SnagList() {
  const [filters, setFilters] = useState({ status: 'open', project: '', search: '' })
  const { projects, loading: projectsLoading } = useProjects()

  useEffect(() => {
    if (projects.length > 0 && !filters.project) {
      setFilters((f) => ({ ...f, project: projects[0].id }))
    }
  }, [projects])

  const { snags, loading: snagsLoading } = useSnags({ projectId: filters.project || undefined })
  const { flats } = useFlats(filters.project || undefined)

  // Build a flatId → flatNumber lookup so SnagCard shows flat numbers not UUIDs
  const flatNumberMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const f of flats) map[f.id] = f.flatNumber
    return map
  }, [flats])

  const filteredSnags = useMemo(() => {
    return snags
      .filter((s) => {
        if (filters.status === 'all')  return true
        if (filters.status === 'open') return ['open', 'assigned'].includes(s.status)
        return s.status === filters.status
      })
      .filter((s) => {
        if (!filters.search) return true
        const q = filters.search.toLowerCase()
        return (
          s.id.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.itemLabel.toLowerCase().includes(q)
        )
      })
  }, [snags, filters])

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'All Projects' },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects]
  )

  const loading = projectsLoading || snagsLoading

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl">De-Snagging</h1>

      <FilterBar
        filters={[
          { id: 'project', label: 'Project', value: filters.project, options: projectOptions },
          { id: 'status',  label: 'Status',  value: filters.status,  options: STATUS_OPTIONS },
        ]}
        search={{ value: filters.search, placeholder: 'Search snags…' }}
        onFilterChange={(id, value) => setFilters((p) => ({ ...p, [id]: value }))}
        onSearchChange={(value) => setFilters((p) => ({ ...p, search: value }))}
      />

      {loading && filteredSnags.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredSnags.length === 0 ? (
        <EmptyState title="No Snags Found" description="Try adjusting your filters." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSnags.map((s) => (
            <SnagCard key={s.id} snag={s} flatNumber={flatNumberMap[s.flatId]} />
          ))}
        </div>
      )}
    </div>
  )
}
