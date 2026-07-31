import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Bell, BellOff, Clock, Save, Shield, Zap,
} from 'lucide-react'
import { settingsApi, type AppSettings } from '../../utils/api'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { Spinner } from '../../components/ui/Spinner'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'

type ToggleKey = Exclude<keyof AppSettings, 'notif.resume_idle_hours'>

const MASTER_KEY: ToggleKey = 'notif.enabled'

const TOGGLE_GROUPS: {
  title: string
  icon: typeof Bell
  rows: { key: ToggleKey; label: string; description: string }[]
}[] = [
  {
    title: 'Master',
    icon: Zap,
    rows: [
      {
        key: 'notif.enabled',
        label: 'Enable all notifications',
        description: 'Master switch — turns off every notification when disabled',
      },
    ],
  },
  {
    title: 'Engineer activity',
    icon: Bell,
    rows: [
      {
        key: 'notif.engineer_start_flat',
        label: 'Engineer starts a flat',
        description: 'Notify QA when an engineer creates a new inspection',
      },
      {
        key: 'notif.engineer_resume_flat',
        label: 'Engineer resumes after idle',
        description: 'Notify QA when work resumes after the idle gap',
      },
      {
        key: 'notif.flat_completion',
        label: 'Flat 100% complete',
        description: 'Notify engineer when all checklist items are done',
      },
    ],
  },
  {
    title: 'QA activity',
    icon: Shield,
    rows: [
      {
        key: 'notif.qa_start_review',
        label: 'QA starts reviewing',
        description: 'Notify the engineer when QA opens a flat for the first time',
      },
      {
        key: 'notif.qa_resume_review',
        label: 'QA resumes review after idle',
        description: 'Notify the engineer when QA continues after the idle gap',
      },
      {
        key: 'notif.existing_submit_review',
        label: 'Submit / approve / reject / revision',
        description: 'Formal workflow notifications (submit and overall review decisions)',
      },
      {
        key: 'notif.qa_task_feedback',
        label: 'Per-task QA revision / reject',
        description: 'Notify engineer when QA flags a single task',
      },
    ],
  },
  {
    title: 'Recipients',
    icon: Shield,
    rows: [
      {
        key: 'notif.notify_admins',
        label: 'Also notify admins',
        description: 'Send copies of activity notifications to admin users',
      },
    ],
  },
]

const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  const { reduced } = useMotionSafe()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-11 shrink-0 rounded-full touch-manipulation',
        'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        checked ? 'bg-brand-600' : 'bg-ink-200',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 16 : 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: 'spring', stiffness: 420, damping: 28 }
        }
      />
    </button>
  )
}

export default function NotificationSettings() {
  const { fadeUp, reduced, stagger } = useMotionSafe()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi
      .get()
      .then(({ data }) => {
        setSettings(data)
        setSavedSnapshot(JSON.stringify(data))
      })
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false))
  }, [])

  const dirty = useMemo(
    () => (settings ? JSON.stringify(settings) !== savedSnapshot : false),
    [settings, savedSnapshot]
  )

  const counts = useMemo(() => {
    if (!settings) return { on: 0, total: 0 }
    const keys = TOGGLE_GROUPS.flatMap((g) => g.rows.map((r) => r.key)).filter(
      (k) => k !== MASTER_KEY
    )
    const on = keys.filter((k) => Boolean(settings[k])).length
    return { on, total: keys.length }
  }, [settings])

  const patch = (key: keyof AppSettings, value: boolean | number) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const { data } = await settingsApi.update(settings)
      setSettings(data)
      setSavedSnapshot(JSON.stringify(data))
      toast.success('Notification settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const masterOff = !settings[MASTER_KEY]
  const idleHours = Number(settings['notif.resume_idle_hours']) || 4

  return (
    <motion.div className="mx-auto max-w-2xl space-y-3 pb-20" {...fadeUp}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">
            Notifications
          </h1>
          <p className="text-[11px] text-ink-400">
            Control activity alerts for engineers, QA, and admins
          </p>
        </div>
        <Button
          size="sm"
          className={compactBtn}
          loading={saving}
          disabled={!dirty}
          onClick={save}
        >
          <Save size={14} aria-hidden />
          Save
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          index={0}
          label="Status"
          value={masterOff ? 'Off' : 'On'}
          icon={masterOff ? BellOff : Bell}
          colorClass={
            masterOff
              ? 'text-ink-500 bg-ink-100'
              : 'text-brand-600 bg-brand-100'
          }
        />
        <StatCard
          index={1}
          label="Enabled"
          value={`${counts.on}/${counts.total}`}
          icon={Zap}
          colorClass="text-success-600 bg-success-100"
        />
        <StatCard
          index={2}
          label="Idle gap"
          value={`${idleHours}h`}
          icon={Clock}
          colorClass="text-warning-600 bg-warning-100"
        />
      </div>

      <AnimatePresence initial={false}>
        {masterOff && (
          <motion.div
            key="master-off"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: easeOut }}
            className="overflow-hidden"
          >
            <Card className="border-warning-200 bg-warning-50/60 p-3 shadow-xs">
              <p className="text-xs font-semibold text-warning-800">
                All notifications are disabled
              </p>
              <p className="mt-0.5 text-[11px] text-warning-700/80">
                Turn on the master switch to enable individual alerts.
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {TOGGLE_GROUPS.map((group, gi) => {
        const Icon = group.icon
        return (
          <motion.div
            key={group.title}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(gi)}
          >
            <Card className="overflow-hidden p-0 shadow-xs">
              <div className="flex items-center gap-2 border-b border-ink-50 bg-ink-50/60 px-3 py-2">
                <Icon size={13} className="text-ink-400" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  {group.title}
                </p>
              </div>
              <div className="divide-y divide-ink-50">
                {group.rows.map((row) => {
                  const disabled = row.key !== MASTER_KEY && masterOff
                  return (
                    <div
                      key={row.key}
                      className={cn(
                        'flex items-start justify-between gap-3 px-3 py-2.5',
                        disabled && 'opacity-50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">{row.label}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-ink-400">
                          {row.description}
                        </p>
                      </div>
                      <Toggle
                        checked={Boolean(settings[row.key])}
                        disabled={disabled}
                        onChange={(v) => patch(row.key, v)}
                      />
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )
      })}

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(TOGGLE_GROUPS.length)}
      >
        <Card
          className={cn(
            'overflow-hidden p-3 shadow-xs',
            masterOff && 'opacity-50'
          )}
        >
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-ink-400" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Resume idle gap
            </p>
          </div>
          <p className="mt-1 text-[11px] text-ink-500">
            After this many hours without activity, the next save/open counts as a resume.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              id="idle-hours"
              type="range"
              min={1}
              max={24}
              disabled={masterOff}
              value={idleHours}
              onChange={(e) =>
                patch('notif.resume_idle_hours', Number(e.target.value))
              }
              className="h-1.5 flex-1 accent-brand-600"
              aria-label="Resume idle gap in hours"
            />
            <span className="w-9 rounded-md bg-ink-50 py-1 text-center text-xs font-bold tabular text-ink-800">
              {idleHours}h
            </span>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            key="save-bar"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 12 }}
            transition={{ duration: 0.32, ease: easeOut }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface/95 p-3 backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
          >
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 sm:justify-end">
              <p className="text-[11px] font-medium text-ink-500 sm:hidden">
                Unsaved changes
              </p>
              <Button
                size="sm"
                className={cn(compactBtn, 'sm:w-auto')}
                loading={saving}
                onClick={save}
              >
                <Save size={14} aria-hidden />
                Save settings
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
