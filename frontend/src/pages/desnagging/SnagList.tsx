import { useState, useEffect, useMemo } from 'react'
import { useSnags } from '../../hooks/useSnags'
import { SnagCard } from '../../components/desnagging/SnagCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { useProjects } from '../../hooks/useProjects'
import { FilterBar } from '../../components/ui/FilterBar'
import { Spinner } from '../../components/ui/Spinner'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_rectification', label: 'In Rectification' },
  { value: 'rectified', label: 'Rectified' },
  { value: 'closed', label: 'Closed' },
]

export default function SnagList() {
  const [filters, setFilters] = useState({
    status: 'open',
    project: '',
    search: '',
  })

  const { projects, loading: projectsLoading } = useProjects()

  useEffect(() => {
    if (projects.length > 0 && !filters.project) {
      setFilters((f) => ({ ...f, project: projects[0].id }))
    }
  }, [projects, filters.project])

  const { snags, loading: snagsLoading } = useSnags({ projectId: filters.project })

  const handleFilterChange = (id: string, value: string) => {
    setFilters((prev) => ({ ...prev, [id]: value }))
  }

  const filteredSnags = useMemo(() => {
    return snags
      .filter((s) => {
        if (filters.status === 'all') return true
        if (filters.status === 'open') return ['open', 'assigned'].includes(s.status)
        return s.status === filters.status
      })
      .filter((s) => {
        if (!filters.search) return true
        const searchTerm = filters.search.toLowerCase()
        return (
          s.id.toString().includes(searchTerm) ||
          s.description.toLowerCase().includes(searchTerm) ||
          s.itemLabel.toLowerCase().includes(searchTerm)
        )
      })
  }, [snags, filters])

  const projectOptions = useMemo(
    () => [{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))],
    [projects]
  )

  const loading = projectsLoading || snagsLoading

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold sm:text-2xl">De-Snagging</h1>

      <FilterBar
        className="mb-4"
        filters={[
          {
            id: 'project',
            label: 'Project',
            value: filters.project,
            options: projectOptions,
          },
          {
            id: 'status',
            label: 'Status',
            value: filters.status,
            options: STATUS_OPTIONS,
          },
        ]}
        search={{
          value: filters.search,
          placeholder: 'Search snags…',
        }}
        onFilterChange={handleFilterChange}
        onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredSnags.length === 0 ? (
        <EmptyState title="No snags found" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSnags.map((s) => (
            <SnagCard key={s.id} snag={s} />
          ))}
        </div>
      )}
    </div>
  )
}
