import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ROUTES } from '../../constants/routes'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const login    = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password.')
      return
    }
    setLoading(true)
    try {
      const redirect = await login(email, password)
      toast.success('Welcome back!')
      navigate(redirect, { replace: true })
    } catch (err) {
      toast.error(
        (err as any)?.response?.data?.error ||
        (err as any)?.response?.data?.message ||
        'Invalid credentials. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pr-14"
          />
          <button
            type="button"
            className="absolute right-0 top-0 flex min-h-full min-w-[52px] touch-manipulation items-center justify-center text-slate-400 active:text-slate-600"
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="text-right">
        <Link to={ROUTES.OTP} className="text-sm font-medium text-primary hover:underline active:underline">
          Login with OTP
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        Sign In
      </Button>

      <p className="pt-2 text-center text-sm text-slate-400">
        Accounts are created by your administrator.
      </p>
    </form>
  )

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-primary to-sidebar safe-all">

      {/* ── MOBILE layout (< md): branding on top, form card slides up from bottom ── */}
      <div className="flex min-h-screen-safe flex-col md:hidden">
        {/* Branding area */}
        <div className="flex flex-1 flex-col items-center justify-end pb-8 pt-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-lg">
            <Building2 size={36} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-white">SnagDesk</h1>
          <p className="mt-2 text-base text-white/70">Snagging &amp; De-Snagging Platform</p>
        </div>
        {/* Form sheet */}
        <div className="w-full rounded-t-3xl bg-white px-6 pb-safe pt-8 shadow-2xl">
          <h2 className="mb-1 text-xl font-bold text-slate-900">Welcome back</h2>
          <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>
          {form}
        </div>
      </div>

      {/* ── DESKTOP layout (≥ md): centered card over gradient ── */}
      <div className="hidden min-h-screen-safe md:flex md:items-center md:justify-center md:p-8">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
          {/* Branding inside card */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 size={28} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">SnagDesk</h1>
            <p className="mt-1 text-sm text-slate-500">Snagging &amp; De-Snagging Platform</p>
          </div>
          <h2 className="mb-1 text-lg font-bold text-slate-900">Welcome back</h2>
          <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>
          {form}
        </div>
      </div>

    </div>
  )
}
