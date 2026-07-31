/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
          950: 'var(--brand-950)',
        },
        accent: {
          100: 'var(--accent-100)',
          500: 'var(--accent-500)',
        },
        success: {
          100: 'var(--success-100)',
          600: 'var(--success-600)',
        },
        warning: {
          100: 'var(--warning-100)',
          600: 'var(--warning-600)',
        },
        danger: {
          100: 'var(--danger-100)',
          600: 'var(--danger-600)',
        },
        info: {
          100: 'var(--info-100)',
          600: 'var(--info-600)',
        },
        ink: {
          50: 'var(--ink-50)',
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          400: 'var(--ink-400)',
          600: 'var(--ink-600)',
          800: 'var(--ink-800)',
          950: 'var(--ink-950)',
        },
        surface: 'var(--surface)',
        // Legacy aliases — keep existing screens compiling
        primary: {
          DEFAULT: 'var(--brand-600)',
          dark: 'var(--brand-700)',
          light: 'var(--brand-100)',
        },
        secondary: {
          DEFAULT: 'var(--warning-600)',
          dark: 'var(--warning-600)',
        },
        pass: 'var(--success-600)',
        fail: 'var(--danger-600)',
        na: 'var(--ink-600)',
        pending: 'var(--warning-600)',
        sidebar: {
          DEFAULT: 'var(--brand-900)',
          active: 'var(--brand-800)',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '36px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        label: ['13px', { lineHeight: '18px', fontWeight: '500', letterSpacing: '0.04em' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        'brand-glow': 'var(--shadow-brand-glow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      height: {
        'screen-dvh': '100dvh',
        'screen-svh': '100svh',
      },
      minHeight: {
        'screen-dvh': '100dvh',
      },
      keyframes: {
        'badge-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'badge-pulse': 'badge-pulse 2s var(--ease-out) infinite',
        shimmer: 'shimmer 1.2s var(--ease-out) 1',
      },
    },
  },
  plugins: [],
}
