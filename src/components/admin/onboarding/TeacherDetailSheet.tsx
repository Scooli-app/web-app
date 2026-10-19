"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  AdminOnboardingResponse,
  AdminSchoolTeacher,
} from "@/services/api/admin-onboarding.service";
import { format } from "date-fns";
import type { ReactNode } from "react";
import {
  CLASS_COUNT_LABELS,
  CURRENT_TOOLS_LABELS,
  PLANNING_DAY_LABELS,
  PREP_HOURS_LABELS,
  TEACHER_ROLE_LABELS,
  getAcquisitionLabel,
  getGoalLabel,
  getLevelLabel,
  getSubjectLabel,
  parseCommaSeparated,
} from "./labels";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground">Sem resposta</span>;
}

function Badges({ items }: { items: string[] }) {
  if (items.length === 0) return <Empty />;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="text-xs">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function roleLabel(role: string | null | undefined) {
  return role ? (TEACHER_ROLE_LABELS[role] ?? role) : null;
}

interface TeacherDetailSheetProps {
  userId: string | null;
  /** Every onboarding row known for this user (v1 and/or v2). */
  responses: AdminOnboardingResponse[];
  /** Fallback identity when the user has no onboarding row. */
  teacher: AdminSchoolTeacher | null;
  onClose: () => void;
}

export function TeacherDetailSheet({
  userId,
  responses,
  teacher,
  onClose,
}: TeacherDetailSheetProps) {
  const primary = responses[0] ?? null;
  const name =
    primary?.userName || primary?.userUsername || teacher?.name || null;
  const email = primary?.userEmail ?? teacher?.email ?? "";

  return (
    <Sheet open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(94vw,28rem)] overflow-y-auto p-6 sm:max-w-md">
        <SheetHeader className="p-0">
          <SheetTitle>{name || email || "Professor"}</SheetTitle>
          <SheetDescription>
            {name ? email : "Respostas do onboarding"}
          </SheetDescription>
        </SheetHeader>

        {responses.length === 0 ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Este professor não tem respostas de onboarding registadas.
            </p>
            {teacher && (
              <>
                <Field label="Escola (como escreveu)">
                  {teacher.schoolNameAsTyped}
                </Field>
                <Field label="Função">
                  {roleLabel(teacher.teacherRole) ?? <Empty />}
                </Field>
              </>
            )}
          </div>
        ) : (
          responses.map((response) => (
            <div key={response.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {response.version}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(response.createdAt), "dd/MM/yyyy HH:mm")}
                </span>
              </div>

              {response.version === "v2" && (
                <>
                  <Field label="Escola (como escreveu)">
                    {response.noSchool
                      ? "Não está numa escola"
                      : (response.schoolName ?? <Empty />)}
                  </Field>
                  <Field label="Função">
                    {roleLabel(response.teacherRole) ?? <Empty />}
                  </Field>
                  <Field label="Dia de planeamento">
                    {response.planningDay ? (
                      PLANNING_DAY_LABELS[response.planningDay]
                    ) : (
                      <Empty />
                    )}
                  </Field>
                </>
              )}

              <Field label="Disciplinas">
                <Badges
                  items={[
                    ...parseCommaSeparated(response.subjectArea).map(
                      getSubjectLabel,
                    ),
                    ...(response.subjectAreaOther
                      ? [`"${response.subjectAreaOther}"`]
                      : []),
                  ]}
                />
              </Field>
              <Field label="Níveis / anos">
                <Badges
                  items={parseCommaSeparated(response.teachingLevel).map(
                    getLevelLabel,
                  )}
                />
              </Field>
              <Field label="Como nos encontrou">
                {response.acquisitionSource ? (
                  <>
                    {getAcquisitionLabel(response.acquisitionSource)}
                    {response.acquisitionSourceOther && (
                      <span className="ml-2 italic text-muted-foreground">
                        {`"${response.acquisitionSourceOther}"`}
                      </span>
                    )}
                  </>
                ) : (
                  <Empty />
                )}
              </Field>
              <Field label="Objetivos">
                <Badges
                  items={parseCommaSeparated(response.goals).map(getGoalLabel)}
                />
              </Field>
              <Field label="Horas a preparar aulas por semana">
                {response.prepHoursPerWeek ? (
                  (PREP_HOURS_LABELS[response.prepHoursPerWeek] ??
                  response.prepHoursPerWeek)
                ) : (
                  <Empty />
                )}
              </Field>
              <Field label="O que usa hoje">
                <Badges
                  items={parseCommaSeparated(response.currentTools).map(
                    (t) => CURRENT_TOOLS_LABELS[t] ?? t,
                  )}
                />
              </Field>
              <Field label="Número de turmas">
                {response.classCount ? (
                  (CLASS_COUNT_LABELS[response.classCount] ??
                  response.classCount)
                ) : (
                  <Empty />
                )}
              </Field>
            </div>
          ))
        )}
      </SheetContent>
    </Sheet>
  );
}
