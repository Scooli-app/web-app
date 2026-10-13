"use client";

import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

const BURST_MS = 1200;
const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const distance = 90 + (i % 3) * 22;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: 6 + (i % 3) * 2,
    tone: i % 2 === 0 ? "bg-primary" : "bg-primary/40",
  };
});

interface CelebrationProps {
  onDone: () => void;
}

/** ~1.2 s check + confetti burst; under reduced motion it hands over immediately. */
export function Celebration({ onDone }: CelebrationProps) {
  const t = useTranslations("onboardingV2.celebration");
  const { reduce, pop } = useMotionSafe();

  useEffect(() => {
    const timer = window.setTimeout(onDone, reduce ? 0 : BURST_MS);
    return () => window.clearTimeout(timer);
  }, [onDone, reduce]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {!reduce &&
          PARTICLES.map((particle, i) => (
            <motion.span
              key={i}
              aria-hidden
              className={`absolute rounded-full ${particle.tone}`}
              style={{ width: particle.size, height: particle.size }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: particle.x, y: particle.y, opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
            />
          ))}
        <motion.div
          variants={pop}
          initial="initial"
          animate="animate"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        >
          <Check className="h-12 w-12" strokeWidth={3} aria-hidden />
        </motion.div>
      </div>
      <div className="space-y-1" role="status">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
    </div>
  );
}
