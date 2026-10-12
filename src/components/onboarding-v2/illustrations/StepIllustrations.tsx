"use client";

import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { cn } from "@/shared/utils/utils";
import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Small inline SVG illustrations for the onboarding steps. They only use theme
 * tokens (primary + soft tints, card, border), so they work in light and dark.
 * The looping motion is decorative and is switched off under reduced motion,
 * which leaves a static drawing.
 */

const BOX = { transformBox: "fill-box" as const, transformOrigin: "center" };

function useLoop() {
  const { reduce } = useMotionSafe();
  /** Gentle back-and-forth loop; `undefined` (static) when motion is reduced. */
  const loop = (duration: number, delay = 0) =>
    reduce
      ? undefined
      : {
          duration,
          delay,
          repeat: Infinity,
          repeatType: "reverse" as const,
          ease: "easeInOut" as const,
        };
  return { reduce, loop };
}

export function IllustrationFrame({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "mx-auto h-14 w-auto max-w-full sm:h-20",
        className,
      )}
    >
      {children}
    </svg>
  );
}

/** Step 1: the school, with a waving flag and windows that light up. */
export function SchoolIllustration() {
  const { reduce, loop } = useLoop();
  return (
    <IllustrationFrame>
      <ellipse cx="80" cy="92" rx="62" ry="5" className="fill-primary/10" />
      <rect x="38" y="42" width="84" height="48" rx="4" className="fill-card stroke-border" strokeWidth="1.5" />
      <path d="M32 44 L80 18 L128 44 Z" className="fill-primary" />
      <rect x="71" y="64" width="18" height="26" rx="3" className="fill-primary/25 stroke-primary" strokeWidth="1.5" />
      {[48, 100].map((x, i) => (
        <motion.rect
          key={x}
          x={x}
          y="52"
          width="12"
          height="12"
          rx="2"
          className="fill-primary/20 stroke-primary/50"
          strokeWidth="1"
          initial={{ opacity: 0.6 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={loop(1.6, i * 0.8)}
        />
      ))}
      <line x1="80" y1="18" x2="80" y2="6" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
      <motion.path
        d="M80 6 L96 10 L80 15 Z"
        className="fill-primary/70"
        style={{ ...BOX, transformOrigin: "left center" }}
        initial={{ scaleX: 1 }}
        animate={reduce ? undefined : { scaleX: 0.7 }}
        transition={loop(1.2)}
      />
    </IllustrationFrame>
  );
}

/** Step 2: a shelf of books and subject chips floating above it. */
export function SubjectsIllustration() {
  const { reduce, loop } = useLoop();
  const chips = [
    { x: 22, y: 14, w: 34, delay: 0 },
    { x: 66, y: 8, w: 40, delay: 0.5 },
    { x: 112, y: 18, w: 30, delay: 1 },
  ];
  return (
    <IllustrationFrame>
      {chips.map((chip) => (
        <motion.rect
          key={chip.x}
          x={chip.x}
          y={chip.y}
          width={chip.w}
          height="14"
          rx="7"
          className="fill-primary/15 stroke-primary/60"
          strokeWidth="1.2"
          initial={{ y: 0 }}
          animate={reduce ? undefined : { y: -3 }}
          transition={loop(1.8, chip.delay)}
        />
      ))}
      <rect x="30" y="52" width="16" height="38" rx="2" className="fill-primary" />
      <rect x="48" y="46" width="14" height="44" rx="2" className="fill-primary/55" />
      <rect x="64" y="56" width="18" height="34" rx="2" className="fill-card stroke-primary" strokeWidth="1.5" />
      <rect x="84" y="50" width="14" height="40" rx="2" className="fill-primary/35" />
      <g transform="rotate(14 112 90)">
        <rect x="104" y="52" width="16" height="38" rx="2" className="fill-primary/80" />
      </g>
      <rect x="22" y="90" width="116" height="4" rx="2" className="fill-border" />
    </IllustrationFrame>
  );
}

/** Step 3: a whiteboard whose lines keep being written. */
export function ClassIllustration() {
  const { reduce, loop } = useLoop();
  return (
    <IllustrationFrame>
      <rect x="22" y="14" width="116" height="66" rx="6" className="fill-card stroke-border" strokeWidth="2" />
      <rect x="22" y="14" width="116" height="10" rx="5" className="fill-primary/15" />
      {[38, 52, 66].map((y, i) => (
        <motion.line
          key={y}
          x1="36"
          y1={y}
          x2={i === 2 ? 90 : 124}
          y2={y}
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0.35 }}
          animate={reduce ? undefined : { pathLength: 1 }}
          transition={loop(1.8, i * 0.4)}
        />
      ))}
      <line x1="50" y1="80" x2="44" y2="94" className="stroke-border" strokeWidth="2" strokeLinecap="round" />
      <line x1="110" y1="80" x2="116" y2="94" className="stroke-border" strokeWidth="2" strokeLinecap="round" />
      <rect x="62" y="84" width="14" height="4" rx="2" className="fill-primary/60" />
      <rect x="80" y="84" width="10" height="4" rx="2" className="fill-primary/30" />
    </IllustrationFrame>
  );
}

const CAL_COLS = 5;
const CAL_ROWS = 3;

/**
 * Step 4: a calendar that fills in as the plan is built. `progress` (0-1) drives
 * the filled cells, so this one tracks real work rather than looping.
 */
export function PlanIllustration({ progress = 0 }: { progress?: number }) {
  const { reduce } = useMotionSafe();
  const total = CAL_COLS * CAL_ROWS;
  const filled = Math.round(Math.min(1, Math.max(0, progress)) * total);
  return (
    <IllustrationFrame>
      <rect x="20" y="14" width="120" height="78" rx="8" className="fill-card stroke-border" strokeWidth="1.5" />
      <path d="M20 22 a8 8 0 0 1 8 -8 h104 a8 8 0 0 1 8 8 v8 h-120 Z" className="fill-primary" />
      <rect x="44" y="8" width="5" height="12" rx="2.5" className="fill-primary/70" />
      <rect x="111" y="8" width="5" height="12" rx="2.5" className="fill-primary/70" />
      {Array.from({ length: total }, (_, i) => {
        const col = i % CAL_COLS;
        const row = Math.floor(i / CAL_COLS);
        const on = i < filled;
        return (
          <g key={i}>
            <rect
              x={30 + col * 22}
              y={38 + row * 17}
              width="16"
              height="11"
              rx="3"
              className="fill-primary/10 stroke-primary/25"
              strokeWidth="1"
            />
            <motion.rect
              x={30 + col * 22}
              y={38 + row * 17}
              width="16"
              height="11"
              rx="3"
              className="fill-primary"
              initial={false}
              animate={{ opacity: on ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.35 }}
            />
          </g>
        );
      })}
    </IllustrationFrame>
  );
}

/** Step 5: a calendar with the planning day highlighted and an envelope floating by. */
export function RitualIllustration() {
  const { reduce, loop } = useLoop();
  return (
    <IllustrationFrame>
      <rect x="16" y="16" width="92" height="74" rx="8" className="fill-card stroke-border" strokeWidth="1.5" />
      <path d="M16 24 a8 8 0 0 1 8 -8 h76 a8 8 0 0 1 8 8 v8 h-92 Z" className="fill-primary" />
      {Array.from({ length: 12 }, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const hot = i === 6;
        return (
          <motion.rect
            key={i}
            x={26 + col * 20}
            y={40 + row * 16}
            width="14"
            height="10"
            rx="3"
            className={hot ? "fill-primary" : "fill-primary/10"}
            style={BOX}
            initial={{ scale: 1 }}
            animate={reduce || !hot ? undefined : { scale: 1.18 }}
            transition={hot ? loop(1.1) : undefined}
          />
        );
      })}
      <motion.g
        initial={{ y: 0 }}
        animate={reduce ? undefined : { y: -4 }}
        transition={loop(1.9)}
      >
        <rect x="104" y="46" width="42" height="30" rx="5" className="fill-card stroke-primary" strokeWidth="1.8" />
        <path d="M105 49 L125 64 L145 49" fill="none" className="stroke-primary" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </motion.g>
    </IllustrationFrame>
  );
}
