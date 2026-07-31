import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Building2, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ROUTES } from '../../constants/routes'
import { useMotionSafe } from '../../hooks/useMotionSafe'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const login    = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const { fadeUp } = useMotionSafe()

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
      const axiosErr = err as any
      const serverMsg = axiosErr?.response?.data?.error || axiosErr?.response?.data?.message
      const networkErr = axiosErr?.code || axiosErr?.message
      toast.error(
        serverMsg ||
        (networkErr ? `Network error: ${networkErr}` : 'Login failed. Check connection.')
      )
    } finally {
      setLoading(false)
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
          Email
        </label>
        <div className="relative">
          <Mail
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-11"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
          Password
        </label>
        <div className="relative">
          <Lock
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            id="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pl-11 pr-14"
          />
          <button
            type="button"
            className="absolute right-0 top-0 flex min-h-full min-w-[52px] touch-manipulation items-center justify-center text-ink-400 active:text-ink-600"
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="text-center">
        <Link
          to={ROUTES.OTP}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-semibold text-ink-600 hover:bg-ink-100 active:bg-ink-100"
        >
          Login with OTP
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        Sign In
      </Button>

      <p className="pt-2 text-center text-caption text-ink-400">
        Accounts are created by your administrator.
      </p>
    </form>
  )

  return (
    <div className="relative min-h-screen-safe overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 safe-all">

      {/* Mesh blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-16 top-1/4 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 h-64 w-64 rounded-full bg-brand-900/30 blur-3xl" />
      </div>

      {/* ── MOBILE layout (< md): branding on top, form sheet slides up from bottom ── */}
      <div className="relative flex min-h-screen-safe flex-col md:hidden">
        <motion.div
          className="flex flex-1 flex-col items-center justify-end pb-8 pt-16"
          {...fadeUp}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.2)] ring-1 ring-white/20">
            <Building2 size={36} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-white">SnagDesk</h1>
          <p className="mt-2 text-body text-white/70">Snagging &amp; De-Snagging Platform</p>
          <p className="mt-3 text-caption text-white/50">by Buildesk</p>
        </motion.div>

        <motion.div
          className="w-full rounded-t-[32px] bg-surface px-6 pb-safe pt-8 shadow-[0_-8px_40px_rgba(15,23,42,0.12)]"
          initial={fadeUp.initial}
          animate={fadeUp.animate}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
        >
          <h2 className="mb-1 font-display text-h2 text-ink-950">Welcome back</h2>
          <p className="mb-6 text-body text-ink-500">Sign in to continue</p>
          {form}
        </motion.div>
      </div>

      {/* ── DESKTOP layout (≥ md): centered card over gradient ── */}
      <div className="relative hidden min-h-screen-safe md:flex md:items-center md:justify-center md:p-8">
        <motion.div
          className="w-full max-w-sm rounded-lg bg-surface p-8 shadow-md"
          {...fadeUp}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 shadow-sm">
              <Building2 size={28} aria-hidden="true" />
            </div>
            <h1 className="font-display text-h2 text-ink-950">SnagDesk</h1>
            <p className="mt-1 text-body text-ink-500">Snagging &amp; De-Snagging Platform</p>
            <p className="mt-2 text-caption text-ink-400">by Buildesk</p>
          </div>
          <h2 className="mb-1 font-display text-lg font-bold text-ink-950">Welcome back</h2>
          <p className="mb-6 text-body text-ink-500">Sign in to continue</p>
          {form}
        </motion.div>
      </div>

    </div>
  )
}
