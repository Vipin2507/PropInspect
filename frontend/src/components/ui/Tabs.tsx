import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '../../utils/cn'

export function Tabs({ tabs, defaultValue }: { tabs: { value: string; label: string; count?: number }[]; defaultValue?: string }) {
  return (
    <RadixTabs.Root defaultValue={defaultValue || tabs[0]?.value}>
      <RadixTabs.List className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className="border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  )
}

export { RadixTabs }
