import * as RadixTabs from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useMotionSafe } from '../../hooks/useMotionSafe'

export function Tabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  tabs: { value: string; label: string; count?: number }[]
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
}) {
  const { reduced } = useMotionSafe()
  const active = value ?? defaultValue ?? tabs[0]?.value

  return (
    <RadixTabs.Root
      value={value}
      defaultValue={defaultValue || tabs[0]?.value}
      onValueChange={onValueChange}
      className={className}
    >
      <RadixTabs.List className="flex gap-1 rounded-full bg-ink-100 p-1">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'relative z-0 flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2',
              'text-sm font-semibold text-ink-600 transition-colors duration-fast',
              'data-[state=active]:text-ink-950',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100'
            )}
          >
            {active === tab.value && !reduced && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {active === tab.value && reduced && (
              <span className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm" />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="rounded-full bg-ink-200/80 px-1.5 py-0.5 text-[10px] font-bold tabular text-ink-600">
                {tab.count}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  )
}

export { RadixTabs }
