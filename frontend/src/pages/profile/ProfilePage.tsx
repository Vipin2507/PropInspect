import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../utils/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'
import {
  User, Mail, Phone, Lock, CheckCircle, Eye, EyeOff, Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const easeOut = [0.22, 1, 0.36, 1] as const
const compactBtn = '!min-h-[36px] !px-2.5 !py-1.5 text-xs'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  engineer: 'Field Engineer',
  qa: 'QA Reviewer',
  viewer: 'Viewer',
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { fadeUp, reduced, stagger } = useMotionSafe()

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
  })
  const [passwords, setPasswords] = useState({ newPass: '', confirm: '' })
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const infoDirty = useMemo(() => {
    if (!user) return false
    return (
      form.name !== (user.name || '') ||
      form.email !== (user.email || '') ||
      form.mobile !== (user.mobile || '')
    )
  }, [form, user])

  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      const { data } = await authApi.updateProfile({
        name: form.name,
        email: form.email,
        mobile: form.mobile,
      })
      setUser(data.user)
      toast.success('Profile updated successfully.')
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } }
      toast.error(ax?.response?.data?.error || 'Failed to update profile.')
    } finally {
      setSavingInfo(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwords.newPass || passwords.newPass.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }
    if (passwords.newPass !== passwords.confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setSavingPass(true)
    try {
      await authApi.updateProfile({ newPassword: passwords.newPass })
      setPasswords({ newPass: '', confirm: '' })
      toast.success('Password changed successfully.')
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } }
      toast.error(ax?.response?.data?.error || 'Failed to change password.')
    } finally {
      setSavingPass(false)
    }
  }

  if (!user) return null

  return (
    <motion.div className="mx-auto max-w-lg space-y-3 pb-10" {...fadeUp}>
      <div>
        <h1 className="font-display text-lg font-bold text-ink-950 md:text-xl">Profile</h1>
        <p className="text-[11px] text-ink-400">Manage your account details</p>
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(0)}
      >
        <Card className="overflow-hidden p-0 shadow-xs">
          <div className="flex items-center gap-3 p-3">
            <Avatar name={user.name} size="lg" role={user.role} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold text-ink-950">
                {user.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-ink-400">{user.email}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                <Shield size={10} aria-hidden />
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(1)}
      >
        <Card className="overflow-hidden p-0 shadow-xs">
          <div className="flex items-center gap-2 border-b border-ink-50 bg-ink-50/60 px-3 py-2">
            <User size={13} className="text-ink-400" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Personal information
            </p>
          </div>
          <form onSubmit={handleInfoSave} className="space-y-3 p-3">
            <div>
              <label className={fieldLabel}>Full name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Email</label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Mobile</label>
              <div className="relative">
                <Phone
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <Input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              className={cn('w-full', compactBtn)}
              loading={savingInfo}
              disabled={!infoDirty}
            >
              <CheckCircle size={14} aria-hidden />
              Save changes
            </Button>
          </form>
        </Card>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(2)}
      >
        <Card className="overflow-hidden p-0 shadow-xs">
          <div className="flex items-center gap-2 border-b border-ink-50 bg-ink-50/60 px-3 py-2">
            <Lock size={13} className="text-ink-400" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              Change password
            </p>
          </div>
          <form onSubmit={handlePasswordSave} className="space-y-3 p-3">
            <div>
              <label className={fieldLabel}>New password</label>
              <div className="relative">
                <Input
                  type={showNewPass ? 'text' : 'password'}
                  value={passwords.newPass}
                  onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 touch-manipulation p-1.5 text-ink-400 active:text-ink-600"
                  aria-label={showNewPass ? 'Hide password' : 'Show password'}
                >
                  {showNewPass ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Confirm password</label>
              <div className="relative">
                <Input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 touch-manipulation p-1.5 text-ink-400 active:text-ink-600"
                  aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPass ? (
                    <EyeOff size={16} aria-hidden />
                  ) : (
                    <Eye size={16} aria-hidden />
                  )}
                </button>
              </div>
              {passwords.confirm && passwords.newPass !== passwords.confirm && (
                <motion.p
                  initial={reduced ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: easeOut }}
                  className="mt-1 text-[11px] text-danger-600"
                >
                  Passwords do not match.
                </motion.p>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className={cn('w-full', compactBtn)}
              loading={savingPass}
              disabled={!passwords.newPass || passwords.newPass !== passwords.confirm}
            >
              Update password
            </Button>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}
