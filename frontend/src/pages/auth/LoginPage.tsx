import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Eye, EyeOff, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ROUTES } from '../../constants/routes'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
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
        (err as any)?.response?.data?.message ||
        'Invalid credentials. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen-safe items-center justify-center bg-gradient-to-br from-primary to-sidebar p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 size={28} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">SnagDesk</h1>
          <p className="mt-2 text-base text-slate-500">
            Welcome! Please login to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <Input
              className="pl-12 h-12 text-base"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <Input
              className="pr-12 h-12 text-base"
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-slate-400"
              onClick={() => setShowPass(!showPass)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
          <div className="text-right">
            <Link
              to={ROUTES.OTP}
              className="text-sm font-medium text-primary hover:underline"
            >
              Login with OTP
            </Link>
          </div>
          <Button type="submit" className="w-full h-12 text-base" loading={loading}>
            Login
          </Button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-400">
          Accounts are created by your administrator.
        </p>
      </div>
    </div>
  );
}
