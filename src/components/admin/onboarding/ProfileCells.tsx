import type { AdminOnboardingResponse } from "@/services/api/admin-onboarding.service";
import {
  CLASS_COUNT_LABELS,
  CURRENT_TOOLS_LABELS,
  PLANNING_DAY_LABELS,
  PREP_HOURS_LABELS,
  TEACHER_ROLE_LABELS,
  parseCommaSeparated,
} from "./labels";

export function formatSchool(response: AdminOnboardingResponse) {
  if (response.noSchool) return "Sem escola";
  return response.schoolName || null;
}

export function ProfileCell({ response }: { response: AdminOnboardingResponse }) {
  const school = formatSchool(response);
  const role = response.teacherRole
    ? (TEACHER_ROLE_LABELS[response.teacherRole] ?? response.teacherRole)
    : null;
  const day = response.planningDay
    ? PLANNING_DAY_LABELS[response.planningDay]
    : null;
  if (!school && !role && !day) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {school && <span className="font-medium">{school}</span>}
      {role && <span className="text-muted-foreground">{role}</span>}
      {day && <span className="text-muted-foreground">{`Planeia: ${day}`}</span>}
    </div>
  );
}

export function BaselineCell({ response }: { response: AdminOnboardingResponse }) {
  const prep = response.prepHoursPerWeek
    ? (PREP_HOURS_LABELS[response.prepHoursPerWeek] ?? response.prepHoursPerWeek)
    : null;
  const classes = response.classCount
    ? (CLASS_COUNT_LABELS[response.classCount] ?? response.classCount)
    : null;
  const tools = parseCommaSeparated(response.currentTools).map(
    (t) => CURRENT_TOOLS_LABELS[t] ?? t,
  );
  if (!prep && !classes && tools.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      {prep && <span>{`Prepara: ${prep}`}</span>}
      {classes && <span>{classes}</span>}
      {tools.length > 0 && <span>{tools.join(", ")}</span>}
    </div>
  );
}
