import type { Variants } from "motion/react";

export interface MotionPresets {
  /** Horizontal step; pass the direction (1 forward, -1 back) as `custom`. */
  step: Variants;
  stagger: Variants;
  item: Variants;
  pop: Variants;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 0.28;

export const FULL_MOTION: MotionPresets = {
  step: {
    initial: (dir: number = 1) => ({ x: dir * 40, opacity: 0 }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: DURATION, ease: EASE },
    },
    exit: (dir: number = 1) => ({
      x: dir * -40,
      opacity: 0,
      transition: { duration: DURATION, ease: EASE },
    }),
  },
  stagger: {
    initial: {},
    animate: { transition: { staggerChildren: 0.035 } },
  },
  item: {
    initial: { y: 8, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: DURATION, ease: EASE },
    },
  },
  pop: {
    initial: { scale: 0.96, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 28 },
    },
  },
};

/** Reduced motion: opacity only, no transforms, no stagger. */
export const REDUCED_MOTION: MotionPresets = {
  step: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },
  stagger: {
    initial: {},
    animate: { transition: { staggerChildren: 0 } },
  },
  item: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
  },
  pop: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
  },
};
