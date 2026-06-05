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
        primary: {
          DEFAULT: '#1A6FE8',
          dark: '#1558C0',
          light: '#EBF2FF',
        },
        secondary: {
          DEFAULT: '#F97316',
          dark: '#EA6C0A',
        },
        pass: '#16A34A',
        fail: '#DC2626',
        na: '#64748B',
        pending: '#D97706',
        info: '#0EA5E9',
        sidebar: {
          DEFAULT: '#0F172A',
          active: '#1E3A5F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // dvh units so h-screen works correctly in Android WebView
      height: {
        'screen-dvh': '100dvh',
        'screen-svh': '100svh',
      },
      minHeight: {
        'screen-dvh': '100dvh',
      },
    },
  },
  plugins: [],
}
