import { Select } from './Select';
import { SearchInput } from './SearchInput';
import { Button } from './Button';
import { SlidersHorizontal } from 'lucide-react';
import { Drawer } from './Drawer';
import { useState } from 'react';
import { cn } from '../../utils/cn';

export function FilterBar({
  filters,
  search,
  onFilterChange,
  onSearchChange,
  className,
}: {
  filters: {
    id: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
  }[];
  search?: {
    value: string;
    placeholder: string;
  };
  onFilterChange: (id: string, value: string) => void;
  onSearchChange?: (value: string) => void;
  className?: string;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filterControls = (
    <>
      {filters.map((filter) => (
        <Select
          key={filter.id}
          value={filter.value}
          onChange={(e) => onFilterChange(filter.id, e.target.value)}
          className="w-full md:w-40"
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ))}
      {search && onSearchChange && (
        <SearchInput
          value={search.value}
          onChange={onSearchChange}
          placeholder={search.placeholder}
          className="w-full md:w-64"
        />
      )}
    </>
  );

  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-center', className)}>
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
        {filterControls}
      </div>

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
          onClick={() => setIsDrawerOpen(true)}
          className="shrink-0 touch-manipulation"
        >
          <SlidersHorizontal size={18} className="mr-2" />
          Filters
        </Button>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Filters"
      >
        <div className="space-y-4">
          {filterControls}
          <Button onClick={() => setIsDrawerOpen(false)} className="w-full">
            Apply Filters
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
