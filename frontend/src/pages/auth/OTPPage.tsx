import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { dashboardForRole, ROUTES } from '../../constants/routes';

export default function OTPPage() {
  const [mobile, setMobile] = useState('9000000002'); // Default for demo
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [countdown, setCountdown] = useState(0);
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await authApi.sendOtp(mobile);
      setIsSent(true);
      setCountdown(45);
      if (data.otp) toast.success(`Dev OTP: ${data.otp}`);
      else toast.success('OTP sent successfully!');
      refs.current[0]?.focus();
    } catch (err) {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const newDigits = [...digits];
    newDigits[i] = v.slice(-1); // Take only the last digit
    setDigits(newDigits);

    if (v && i < 5) {
      refs.current[i + 1]?.focus();
    }

    if (newDigits.join('').length === 6) {
      verifyOtp(newDigits.join(''));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const verifyOtp = async (otp: string) => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await authApi.verifyOtp(mobile, otp);
      setAuth(data.user, data.token);
      toast.success('Login successful!');
      navigate(dashboardForRole(data.user.role), { replace: true });
    } catch {
      toast.error('Invalid OTP. Please try again.');
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSent) {
      sendOtp();
    } else {
      verifyOtp(digits.join(''));
    }
  };

  return (
    <div className="flex min-h-screen-safe items-center justify-center bg-gradient-to-br from-primary to-sidebar p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <Link
          to={ROUTES.LOGIN}
          className="absolute left-4 top-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-primary"
        >
          <ArrowLeft size={18} />
          Back
        </Link>
        <div className="mb-8 text-center pt-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Enter OTP</h1>
          <p className="mt-2 text-base text-slate-500">
            {isSent
              ? `Enter the code sent to ${mobile}`
              : 'Enter your mobile to get an OTP.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isSent ? (
            <div className="relative">
              <Input
                className="h-12 text-center text-lg tracking-wider"
                type="tel"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
          ) : (
            <div className="flex justify-center gap-2 sm:gap-3">
              {digits.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => (refs.current[i] = el)}
                  className="aspect-square h-12 w-12 text-center text-2xl font-bold sm:h-14 sm:w-14"
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  required
                  disabled={isLoading}
                />
              ))}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            loading={isLoading}
            disabled={isLoading || (isSent && countdown > 0)}
          >
            {!isSent ? 'Send OTP' : (countdown > 0 ? `Resend in ${countdown}s` : 'Verify OTP')}
          </Button>
        </form>

        {isSent && (
          <div className="mt-6 text-center">
            <button
              onClick={sendOtp}
              disabled={countdown > 0 || isLoading}
              className="text-sm font-medium text-primary disabled:cursor-not-allowed disabled:text-slate-400 hover:underline"
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
