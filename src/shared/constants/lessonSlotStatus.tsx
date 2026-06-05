import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  SkipForward,
} from "lucide-react";

export type LessonSlotStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed"
  | "skipped";

export type BadgeCfg = {
  label: string;
  badgeCls: string;
  dotCls: string;
  icon: React.ReactNode;
};

export const SLOT_STATUS_CONFIG: Record<LessonSlotStatus, BadgeCfg> = {
  pending: {
    label: "Pendente",
    badgeCls: "bg-muted text-muted-foreground border",
    dotCls: "bg-muted-foreground/50",
    icon: <Clock className="h-3 w-3" />,
  },
  generating: {
    label: "A gerar",
    badgeCls:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    dotCls: "bg-blue-500 animate-pulse",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    label: "Gerado",
    badgeCls:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300",
    dotCls: "bg-green-500",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Falhou",
    badgeCls:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300",
    dotCls: "bg-red-500",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  skipped: {
    label: "Ignorado",
    badgeCls: "bg-muted text-muted-foreground/60 border",
    dotCls: "bg-muted-foreground/30",
    icon: <SkipForward className="h-3 w-3" />,
  },
};
