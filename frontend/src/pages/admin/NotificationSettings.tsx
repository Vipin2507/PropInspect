import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { settingsApi, type AppSettings } from '../../utils/api'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../utils/cn'

const TOGGLE_ROWS: { key: keyof AppSettings; label: string; description: string }[] = [
  {
    key: 'notif.enabled',
    label: 'Enable all notifications',
    description: 'Master switch — turns off every notification when disabled',
  },
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
    key: 'notif.flat_completion',
    label: 'Flat 100% complete',
    description: 'Notify engineer when all checklist items are done',
  },
  {
    key: 'notif.qa_task_feedback',
    label: 'Per-task QA revision / reject',
    description: 'Notify engineer when QA flags a single task',
  },
  {
    key: 'notif.notify_admins',
    label: 'Also notify admins',
    description: 'Send copies of activity notifications to admin users',
  },
]

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors touch-manipulation',
        checked ? 'bg-primary' : 'bg-slate-300',
        disabled && 'opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5'
        )}
      />
    </button>
  )
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi
      .get()
      .then(({ data }) => setSettings(data))
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false))
  }, [])

  const patch = (key: keyof AppSettings, value: boolean | number) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const { data } = await settingsApi.update(settings)
      setSettings(data)
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

  const masterOff = !settings['notif.enabled']

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Notification Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Control which activity alerts are sent to engineers, QA, and admins.
        </p>
      </div>

      <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        {TOGGLE_ROWS.map((row, i) => {
          const disabled = row.key !== 'notif.enabled' && masterOff
          return (
            <div
              key={row.key}
              className={cn(
                'flex items-start justify-between gap-4 py-3',
                i > 0 && 'border-t border-slate-100'
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>
              </div>
              <Toggle
                checked={Boolean(settings[row.key])}
                disabled={disabled}
                onChange={(v) => patch(row.key, v)}
              />
            </div>
          )
        })}

        <div className="border-t border-slate-100 pt-4">
          <label htmlFor="idle-hours" className="text-sm font-semibold text-slate-800">
            Resume idle gap (hours)
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            After this many hours without activity, the next save/open counts as a resume.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              id="idle-hours"
              type="range"
              min={1}
              max={24}
              disabled={masterOff}
              value={Number(settings['notif.resume_idle_hours']) || 4}
              onChange={(e) => patch('notif.resume_idle_hours', Number(e.target.value))}
              className="h-2 flex-1 accent-primary"
            />
            <span className="w-10 text-center text-sm font-bold text-slate-800">
              {Number(settings['notif.resume_idle_hours']) || 4}h
            </span>
          </div>
        </div>
      </div>

      <Button className="w-full sm:w-auto sm:self-end" loading={saving} onClick={save}>
        Save settings
      </Button>
    </div>
  )
}
