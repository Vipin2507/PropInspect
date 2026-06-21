import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { dashboardForRole, ROUTES } from '../../constants/routes'

export default function OTPPage() {
  const [mobile, setMobile]       = useState('')
  const [digits, setDigits]       = useState(Array(6).fill(''))
  const [countdown, setCountdown] = useState(0)
  const [isSent, setIsSent]       = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const refs    = useRef<(HTMLInputElement | null)[]>([])
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

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
    if (otp.length !== 6) { toast.error('Please enter the complete 6-digit OTP.'); return }
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

  // Shared form body — used in both mobile and desktop layouts
  const formBody = (
    <>
      <Link
        to={ROUTES.LOGIN}
        className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary active:text-primary"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Login
      </Link>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isSent ? (
          <div>
            <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium text-slate-700">
              Mobile Number
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
          </div>
        ) : (
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700">
              Enter 6-digit OTP
            </label>
            <div className="flex justify-between gap-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (refs.current[i] = el)}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={isLoading}
                  className="h-14 w-full rounded-xl border border-slate-200 bg-white text-center font-bold text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary-light disabled:opacity-50"
                  style={{ fontSize: '20px' }}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" loading={isLoading}>
          {!isSent ? 'Send OTP' : 'Verify OTP'}
        </Button>
      </form>

      {isSent && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Didn't receive it?{' '}
          <button
            onClick={sendOtp}
            disabled={countdown > 0 || isLoading}
            className="font-medium text-primary disabled:text-slate-400 active:underline"
            style={{ fontSize: '14px' }}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
          </button>
        </p>
      )}
    </>
  )

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-primary to-sidebar safe-all">

      {/* ── MOBILE layout (< md) ── */}
      <div className="flex min-h-screen-safe flex-col md:hidden">
        <div className="flex flex-1 flex-col items-center justify-end pb-8 pt-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-lg">
            <Shield size={36} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-white">OTP Login</h1>
          <p className="mt-2 text-base text-white/70">
            {isSent ? `Code sent to ${mobile}` : 'Enter your mobile number'}
          </p>
        </div>
        <div className="w-full rounded-t-3xl bg-white px-6 pb-safe pt-8 shadow-2xl">
          {formBody}
        </div>
      </div>

      {/* ── DESKTOP layout (≥ md): centered card ── */}
      <div className="hidden min-h-screen-safe md:flex md:items-center md:justify-center md:p-8">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Shield size={28} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">OTP Login</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isSent ? `Code sent to ${mobile}` : 'Enter your mobile number'}
            </p>
          </div>
          {formBody}
        </div>
      </div>

    </div>
  )
}
