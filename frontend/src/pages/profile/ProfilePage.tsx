import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../utils/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { User, Mail, Phone, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [form, setForm] = useState({
    name:        user?.name    || '',
    email:       user?.email   || '',
    mobile:      user?.mobile  || '',
  })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [savingInfo, setSavingInfo]   = useState(false)
  const [savingPass, setSavingPass]   = useState(false)
  const [showNewPass, setShowNewPass]     = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      const { data } = await authApi.updateProfile({
        name:   form.name,
        email:  form.email,
        mobile: form.mobile,
      })
      setUser(data.user)
      toast.success('Profile updated successfully.')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update profile.')
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
      setPasswords({ current: '', newPass: '', confirm: '' })
      toast.success('Password changed successfully.')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password.')
    } finally {
      setSavingPass(false)
    }
  }

  if (!user) return null

  const roleLabel: Record<string, string> = {
    admin:    'Administrator',
    engineer: 'Field Engineer',
    qa:       'QA Reviewer',
    viewer:   'Viewer',
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <h1 className="font-display text-h2 text-ink-950">My Profile</h1>

      {/* Avatar + role badge */}
      <Card className="flex items-center gap-5 p-5">
        <Avatar name={user.name} size="xl" role={user.role} />
        <div>
          <p className="font-display text-lg font-bold text-ink-950">{user.name}</p>
          <span className="mt-1.5 inline-flex rounded-full bg-brand-100 px-3 py-1 text-label font-semibold text-brand-700">
            {roleLabel[user.role] ?? user.role}
          </span>
        </div>
      </Card>

      {/* Personal info form */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <User size={16} aria-hidden="true" />
          </span>
          <h2 className="font-display text-base font-semibold text-ink-800">Personal Information</h2>
        </div>
        <form onSubmit={handleInfoSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Full Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
                className="pl-11"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Mobile
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <Input
                type="tel"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="10-digit mobile number"
                className="pl-11"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={savingInfo}>
            <CheckCircle size={18} aria-hidden="true" />
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Change password form */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-100 text-warning-600">
            <Lock size={16} aria-hidden="true" />
          </span>
          <h2 className="font-display text-base font-semibold text-ink-800">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showNewPass ? 'text' : 'password'}
                value={passwords.newPass}
                onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 touch-manipulation text-ink-400 active:text-ink-600"
                aria-label={showNewPass ? 'Hide password' : 'Show password'}
              >
                {showNewPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPass ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Repeat new password"
                autoComplete="new-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 touch-manipulation text-ink-400 active:text-ink-600"
                aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
              >
                {showConfirmPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {passwords.confirm && passwords.newPass !== passwords.confirm && (
              <p className="mt-1.5 text-sm text-danger-600">Passwords do not match.</p>
            )}
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            loading={savingPass}
            disabled={!passwords.newPass || passwords.newPass !== passwords.confirm}
          >
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  )
}
