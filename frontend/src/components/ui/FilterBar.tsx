import { Select } from './Select'
import { SearchInput } from './SearchInput'
import { Button } from './Button'
import { SlidersHorizontal } from 'lucide-react'
import { Drawer } from './Drawer'
import { useState } from 'react'
import { cn } from '../../utils/cn'

export function FilterBar({
  filters,
  search,
  onFilterChange,
  onSearchChange,
  className,
}: {
  filters: {
    id: string
    label: string
    value: string
    options: { value: string; label: string }[]
  }[]
  search?: { value: string; placeholder: string }
  onFilterChange: (id: string, value: string) => void
  onSearchChange?: (value: string) => void
  className?: string
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const filterSelects = (
    <>
      {filters.map((filter) => (
        <Select
          key={filter.id}
          value={filter.value}
          onChange={(e) => onFilterChange(filter.id, e.target.value)}
          className="w-full"
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ))}
    </>
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Desktop layout */}
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
        {filterSelects}
        {search && onSearchChange && (
          <SearchInput
            value={search.value}
            onChange={onSearchChange}
            placeholder={search.placeholder}
            className="w-64"
          />
        )}
      </div>

      {/* Mobile layout: search inline + filters in drawer */}
      <div className="flex items-center gap-3 md:hidden">
        {search && onSearchChange && (
          <SearchInput
            value={search.value}
            onChange={onSearchChange}
            placeholder={search.placeholder}
            className="min-w-0 flex-1"
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDrawerOpen(true)}
          className="shrink-0 touch-manipulation"
          aria-label="Open filters"
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>Filters</span>
        </Button>
      </div>

      {/* Filter drawer (mobile) */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Filters">
        <div className="space-y-4">
          {filterSelects}
          <Button onClick={() => setIsDrawerOpen(false)} className="w-full">
            Apply Filters
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
