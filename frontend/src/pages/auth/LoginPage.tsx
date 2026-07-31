import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ROUTES } from '../../constants/routes'
import { useMotionSafe } from '../../hooks/useMotionSafe'

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const easeOut = [0.22, 1, 0.36, 1] as const

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const { fadeUp, reduced } = useMotionSafe()

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
      const axiosErr = err as {
        response?: { data?: { error?: string; message?: string } }
        code?: string
        message?: string
      }
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: easeOut, delay: 0.06 }}
      >
        <label htmlFor="email" className={fieldLabel}>
          Email
        </label>
        <div className="relative">
          <Mail
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-9"
          />
        </div>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: easeOut, delay: 0.1 }}
      >
        <label htmlFor="password" className={fieldLabel}>
          Password
        </label>
        <div className="relative">
          <Lock
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            id="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pl-9 pr-12"
          />
          <button
            type="button"
            className="absolute right-0 top-0 flex min-h-full min-w-[44px] touch-manipulation items-center justify-center text-ink-400 active:text-ink-600"
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </motion.div>

      <motion.div
        className="text-center"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.36, ease: easeOut, delay: 0.14 }}
      >
        <Link
          to={ROUTES.OTP}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md px-3 text-xs font-semibold text-brand-600 hover:bg-brand-50 active:bg-brand-50"
        >
          Login with OTP
        </Link>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: easeOut, delay: 0.16 }}
      >
        <Button type="submit" className="w-full" loading={loading}>
          Sign In
        </Button>
      </motion.div>

      <p className="pt-1 text-center text-[11px] text-ink-400">
        Accounts are created by your administrator.
      </p>
    </form>
  )

  return (
    <div className="relative min-h-screen-safe overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 safe-all">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          animate={reduced ? undefined : { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-16 top-1/4 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl"
          animate={reduced ? undefined : { scale: [1, 1.12, 1], x: [0, -12, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute bottom-1/3 left-1/3 h-64 w-64 rounded-full bg-brand-900/30 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen-safe flex-col md:hidden">
        <motion.div
          className="flex flex-1 flex-col items-center justify-end pb-8 pt-16"
          {...fadeUp}
        >
          <motion.img
            src="/icons/icon-192.png"
            alt=""
            className="h-20 w-20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] ring-1 ring-white/20"
            width={80}
            height={80}
            initial={reduced ? false : { scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: easeOut }}
          />
          <h1 className="mt-5 font-display text-3xl font-bold text-white">SnagDesk</h1>
          <p className="mt-2 text-sm text-white/70">Snagging &amp; De-Snagging Platform</p>
          <p className="mt-2 text-[11px] text-white/50">by Buildesk</p>
        </motion.div>

        <motion.div
          className="w-full rounded-t-[28px] bg-surface px-5 pb-safe pt-6 shadow-[0_-8px_40px_rgba(15,23,42,0.12)]"
          initial={reduced ? false : { y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: easeOut, delay: 0.08 }}
        >
          <h2 className="mb-0.5 font-display text-lg font-bold text-ink-950">Welcome back</h2>
          <p className="mb-4 text-[11px] text-ink-400">Sign in to continue</p>
          {form}
        </motion.div>
      </div>

      <div className="relative hidden min-h-screen-safe md:flex md:items-center md:justify-center md:p-8">
        <motion.div
          className="w-full max-w-sm rounded-lg border border-white/10 bg-surface p-7 shadow-md"
          {...fadeUp}
        >
          <div className="mb-6 text-center">
            <img
              src="/icons/icon-192.png"
              alt=""
              className="mx-auto mb-3 h-14 w-14 rounded-2xl shadow-sm"
              width={56}
              height={56}
            />
            <h1 className="font-display text-xl font-bold text-ink-950">SnagDesk</h1>
            <p className="mt-1 text-[11px] text-ink-400">Snagging &amp; De-Snagging Platform</p>
            <p className="mt-1 text-[10px] text-ink-300">by Buildesk</p>
          </div>
          <h2 className="mb-0.5 font-display text-base font-bold text-ink-950">Welcome back</h2>
          <p className="mb-4 text-[11px] text-ink-400">Sign in to continue</p>
          {form}
        </motion.div>
      </div>
    </div>
  )
}
