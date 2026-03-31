import type { PresentationIconName } from "@/shared/types/presentation";
import {
  BookOpen,
  Brain,
  ChartColumn,
  Clock3,
  Globe,
  GraduationCap,
  Lightbulb,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

export const presentationIconMap: Record<PresentationIconName, LucideIcon> = {
  sparkles: Sparkles,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  lightbulb: Lightbulb,
  target: Target,
  globe: Globe,
  users: Users,
  "chart-column": ChartColumn,
  brain: Brain,
  "shield-check": ShieldCheck,
  "clock-3": Clock3,
  quote: Quote,
};

export const presentationIconOptions = Object.entries(presentationIconMap).map(
  ([key, Icon]) => ({
    id: key as PresentationIconName,
    Icon,
  }),
);
