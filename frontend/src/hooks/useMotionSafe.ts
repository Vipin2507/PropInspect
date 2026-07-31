import { useReducedMotion } from 'framer-motion'

/** Respect prefers-reduced-motion for Framer Motion props. */
export function useMotionSafe() {
  const reduced = useReducedMotion()
  return {
    reduced: !!reduced,
    fadeUp: reduced
      ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
        },
    stagger: (i: number) =>
      reduced
        ? { delay: 0 }
        : { delay: i * 0.055, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }
}
