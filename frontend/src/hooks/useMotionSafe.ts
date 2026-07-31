import { useReducedMotion } from 'framer-motion'

/** Respect prefers-reduced-motion for Framer Motion props. */
export function useMotionSafe() {
  const reduced = useReducedMotion()
  return {
    reduced: !!reduced,
    fadeUp: reduced
      ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
        },
    stagger: (i: number) =>
      reduced
        ? { delay: 0 }
        : { delay: i * 0.04, duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  }
}
