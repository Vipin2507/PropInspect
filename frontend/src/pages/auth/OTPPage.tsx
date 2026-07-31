import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Shield, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { dashboardForRole, ROUTES } from '../../constants/routes'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { cn } from '../../utils/cn'

const fieldLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-400'
const easeOut = [0.22, 1, 0.36, 1] as const

export default function OTPPage() {
  const [mobile, setMobile] = useState('')
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [countdown, setCountdown] = useState(0)
  const [isSent, setIsSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const { fadeUp, reduced } = useMotionSafe()

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error('Please enter a valid 10-digit mobile number.')
      return
    }
    setIsLoading(true)
    try {
      const { data } = await authApi.sendOtp(mobile)
      setIsSent(true)
      setCountdown(45)
      if (data.otp) toast.success(`Dev OTP: ${data.otp}`)
      else toast.success('OTP sent!')
      setTimeout(() => refs.current[0]?.focus(), 100)
    } catch {
      toast.error('Failed to send OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDigitChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const next = [...digits]
    next[i] = v.slice(-1)
    setDigits(next)
    if (v && i < 5) refs.current[i + 1]?.focus()
    if (next.join('').length === 6) verifyOtp(next.join(''))
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const verifyOtp = async (otp: string) => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.')
      return
    }
    setIsLoading(true)
    try {
      const { data } = await authApi.verifyOtp(mobile, otp)
      setAuth(data.user, data.token)
      toast.success('Login successful!')
      navigate(dashboardForRole(data.user.role), { replace: true })
    } catch {
      toast.error('Invalid OTP. Please try again.')
      setDigits(Array(6).fill(''))
      refs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSent) sendOtp()
    else verifyOtp(digits.join(''))
  }

  const subtitle = isSent ? `Code sent to ${mobile}` : 'Enter your mobile number'

  const formBody = (
    <>
      <Link
        to={ROUTES.LOGIN}
        className="mb-4 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-brand-600 active:text-brand-600"
      >
        <ArrowLeft size={14} aria-hidden />
        Back to Login
      </Link>

      <form onSubmit={handleSubmit} className="space-y-3">
        <AnimatePresence mode="wait" initial={false}>
          {!isSent ? (
            <motion.div
              key="mobile"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: easeOut }}
            >
              <label htmlFor="mobile" className={fieldLabel}>
                Mobile number
              </label>
              <Input
                id="mobile"
                type="tel"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                autoComplete="tel"
              />
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: easeOut }}
            >
              <label className={fieldLabel}>Enter 6-digit OTP</label>
              <div className="flex justify-between gap-1.5">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el
                    }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={isLoading}
                    className={cn(
                      'h-12 w-full rounded-md border border-ink-200 bg-surface text-center font-bold tabular text-ink-950 outline-none',
                      'transition-all duration-fast focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
                      'disabled:opacity-50'
                    )}
                    style={{ fontSize: '18px' }}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" className="w-full" loading={isLoading}>
          {!isSent ? 'Send OTP' : 'Verify OTP'}
        </Button>
      </form>

      {isSent && (
        <p className="mt-3 text-center text-[11px] text-ink-400">
          Didn&apos;t receive it?{' '}
          <button
            type="button"
            onClick={sendOtp}
            disabled={countdown > 0 || isLoading}
            className="font-semibold text-brand-600 disabled:text-ink-300"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
          </button>
        </p>
      )}
    </>
  )

  return (
    <div className="relative min-h-screen-safe overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 safe-all">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-16 top-1/4 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 h-64 w-64 rounded-full bg-brand-900/30 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen-safe flex-col md:hidden">
        <motion.div
          className="flex flex-1 flex-col items-center justify-end pb-8 pt-16"
          {...fadeUp}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/20">
            <Shield size={32} className="text-white" aria-hidden />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-white">OTP Login</h1>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={subtitle}
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="mt-2 text-sm text-white/70"
            >
              {subtitle}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="w-full rounded-t-[28px] bg-surface px-5 pb-safe pt-6 shadow-[0_-8px_40px_rgba(15,23,42,0.12)]"
          initial={reduced ? false : { y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: easeOut, delay: 0.08 }}
        >
          {formBody}
        </motion.div>
      </div>

      <div className="relative hidden min-h-screen-safe md:flex md:items-center md:justify-center md:p-8">
        <motion.div
          className="w-full max-w-sm rounded-lg border border-white/10 bg-surface p-7 shadow-md"
          {...fadeUp}
        >
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <Shield size={24} aria-hidden />
            </div>
            <h1 className="font-display text-xl font-bold text-ink-950">OTP Login</h1>
            <p className="mt-1 text-[11px] text-ink-400">{subtitle}</p>
          </div>
          {formBody}
        </motion.div>
      </div>
    </div>
  )
}
