"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/shared/utils/utils";
import { Activity, CircleHelp, Repeat, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { formatPercent, formatCount } from "./format";
import type { PilotHeadlines as Headlines } from "./pilot-metrics";

interface HeadlineCardProps {
  icon: ReactNode;
  label: string;
  definition: string;
  value: string;
  sub: string;
}

function HeadlineCard({ icon, label, definition, value, sub }: HeadlineCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            {icon}
            <span className="truncate">{label}</span>
          </span>
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={definition}
              className="shrink-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CircleHelp className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{definition}</TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

interface PilotHeadlinesProps {
  headlines: Headlines;
  className?: string;
}

export function PilotHeadlines({ headlines, className }: PilotHeadlinesProps) {
  const t = useTranslations("adminPilot");
  const none = t("sub.none");

  return (
    <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>
      <HeadlineCard
        icon={<Activity className="h-4 w-4 shrink-0" />}
        label={t("headlines.answerRate")}
        definition={t("definitions.answerRate")}
        value={formatPercent(headlines.answerRate)}
        sub={
          headlines.lessonsDue > 0
            ? t("sub.answerRate", {
                answered: formatCount(headlines.answered),
                due: formatCount(headlines.lessonsDue),
              })
            : none
        }
      />
      <HeadlineCard
        icon={<Users className="h-4 w-4 shrink-0" />}
        label={t("headlines.activeTeachers")}
        definition={t("definitions.activeTeachers")}
        value={formatCount(headlines.activeTeachers)}
        sub={t("sub.activeTeachers", { total: formatCount(headlines.teachersInPilot) })}
      />
      <HeadlineCard
        icon={<Sparkles className="h-4 w-4 shrink-0" />}
        label={t("headlines.proposals")}
        definition={t("definitions.proposals")}
        value={formatPercent(headlines.proposalAcceptRate)}
        sub={
          headlines.proposalsDecided > 0
            ? t("sub.proposals", {
                accepted: formatCount(headlines.proposalsAccepted),
                decided: formatCount(headlines.proposalsDecided),
              })
            : none
        }
      />
      <HeadlineCard
        icon={<Repeat className="h-4 w-4 shrink-0" />}
        label={t("headlines.loop")}
        definition={t("definitions.loop")}
        value={formatPercent(headlines.loopCompletionRate)}
        sub={
          headlines.loopStarted > 0
            ? t("sub.loop", {
                completed: formatCount(headlines.loopCompleted),
                started: formatCount(headlines.loopStarted),
              })
            : none
        }
      />
    </div>
  );
}
