"use client";

import { useReducedMotion } from "motion/react";
import { FULL_MOTION, REDUCED_MOTION, type MotionPresets } from "./presets";

/**
 * Motion variants that respect `prefers-reduced-motion`: when the user has
 * reduced motion enabled, every preset collapses to a short opacity fade.
 */
export function useMotionSafe(): { reduce: boolean } & MotionPresets {
  const reduce = useReducedMotion() ?? false;
  return { reduce, ...(reduce ? REDUCED_MOTION : FULL_MOTION) };
}
