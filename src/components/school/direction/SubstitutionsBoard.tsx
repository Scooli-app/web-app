"use client";

import { useCountry } from "@/hooks/useCountry";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/ui/load-error";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  deleteDirectionSubstitution,
  getDirectionSubstitutions,
  registerDirectionSubstitution,
} from "@/services/api/school-direction.service";
import type { OrganizationMember } from "@/shared/types";
import type { DirectionHandoverLesson, DirectionSubstitution } from "@/shared/types/school-direction";
import { toIso } from "@/shared/utils/calendar";
import { cn } from "@/shared/utils/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectWorkspaceError, selectWorkspaceMembers } from "@/store/workspace/selectors";
import { fetchOrganizationMembers } from "@/store/workspace/workspaceSlice";
import { FileText, Loader2, UserRoundCog } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ClassHistory } from "./ClassHistory";
import { formatClass, formatDay, formatSubject, nextSchoolDay } from "./format";
import { STATE_CLASSES } from "./StatePill";

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

function AbsenceForm({
  members,
  onRegistered,
  onCancel,
}: {
  members: OrganizationMember[];
  onRegistered: (substitution: DirectionSubstitution) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("schoolDirection.substitutions.dialog");
  const tSchool = useTranslations("school");
  const locale = useLocale();
  const [teacherId, setTeacherId] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [date, setDate] = useState<Date | undefined>(() => nextSchoolDay(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  // Closing the dialog unmounts this form; an answer that arrives after that is dropped.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const nameOf = (m: OrganizationMember) => m.name || m.email || tSchool("members.unnamedMember");
  const byName = (a: OrganizationMember, b: OrganizationMember) => nameOf(a).localeCompare(nameOf(b), locale);
  // Anyone can be away, a director who also teaches included.
  const teachers = [...members].sort(byName);
  const substitutes = members.filter((m) => m.userId !== teacherId).sort(byName);
  const teacher = members.find((m) => m.userId === teacherId);
  const substitute = members.find((m) => m.userId === substituteId);

  const submit = async () => {
    if (!teacher || !substitute || !date) return;
    setSubmitting(true);
    setFailed(false);
    try {
      const substitution = await registerDirectionSubstitution(teacher.userId, substitute.userId, toIso(date));
      if (!mounted.current) return;
      onRegistered(substitution);
    } catch {
      if (!mounted.current) return;
      setFailed(true);
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 px-6 pt-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="absence-teacher">{t("teacher")}</Label>
          <Select
            value={teacherId}
            onValueChange={(id) => {
              setTeacherId(id);
              if (id === substituteId) setSubstituteId("");
            }}
          >
            <SelectTrigger id="absence-teacher">
              <SelectValue placeholder={t("choose")} />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {nameOf(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div role="group" aria-labelledby="absence-date" className="flex flex-col gap-2">
          <Label id="absence-date">{t("date")}</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="absence-substitute">{t("substitute")}</Label>
          <Select value={substituteId} onValueChange={setSubstituteId}>
            <SelectTrigger id="absence-substitute">
              <SelectValue placeholder={t("choose")} />
            </SelectTrigger>
            <SelectContent>
              {substitutes.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {nameOf(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{t("substituteHint")}</p>
        </div>

        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={!teacher || !substitute || !date || submitting}>
          {submitting && <Loader2 aria-hidden className="animate-spin" />}
          {t("confirm")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function LessonCard({ lesson, substituteName }: { lesson: DirectionHandoverLesson; substituteName: string }) {
  const t = useTranslations("schoolDirection.substitutions");
  const locale = useLocale();
  const countryCode = useCountry();
  // The handover carries the subject as typed only; formatSubject translates the known ones.
  const subject = formatSubject(lesson.subjectLabel, lesson.subjectLabel, countryCode);

  return (
    <Card className="gap-4 px-4 py-5 sm:px-6">
      <div>
        <Pill className={STATE_CLASSES.on_track}>{t("shared", { name: substituteName })}</Pill>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("lessonHeading", {
            class: formatClass(lesson.grade, lesson.classLabel, locale, countryCode),
            subject,
            n: lesson.sequenceNumber,
          })}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("sharedHint", { name: substituteName })}</p>
      </div>

      {lesson.topicTitle && (
        <div>
          <p className="text-sm text-muted-foreground">{t("topic")}</p>
          <p className="font-medium text-foreground">{lesson.topicTitle}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("leftOff")}</p>
        <ClassHistory history={lesson.history} />
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{t("documents")}</p>
        {lesson.documents.length > 0 ? (
          // Titles only, for the direction: the substitute never gets the absent teacher's documents.
          <ul className="mt-1 divide-y divide-border/60">
            {lesson.documents.map((doc, i) => (
              <li key={i} className="flex items-center gap-2.5 py-2 text-foreground">
                <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">{doc.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-foreground">{t("noDocuments")}</p>
        )}
      </div>
    </Card>
  );
}

/** A director's cover sheet: absences are stored, and each substitute sees that day's lessons in their calendar. */
export function SubstitutionsBoard() {
  const t = useTranslations("schoolDirection.substitutions");
  const tSchool = useTranslations("school");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectWorkspaceMembers);
  const membersError = useAppSelector(selectWorkspaceError);
  const [substitutions, setSubstitutions] = useState<DirectionSubstitution[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<DirectionSubstitution | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const loadMembers = useCallback(() => void dispatch(fetchOrganizationMembers()), [dispatch]);
  useEffect(loadMembers, [loadMembers]);

  const load = useCallback(() => {
    setLoadFailed(false);
    getDirectionSubstitutions()
      .then(setSubstitutions)
      .catch(() => setLoadFailed(true));
  }, []);
  useEffect(load, [load]);

  const activeMembers = members.filter((m) => m.status === "active");
  const list = substitutions ?? [];
  const selected = list.find((s) => s.id === selectedId) ?? list[0];
  const nameOf = (person: { name: string | null; email: string | null }) =>
    person.name || person.email || tSchool("members.unnamedMember");

  const register = (substitution: DirectionSubstitution) => {
    setSubstitutions((prev) => [substitution, ...(prev ?? []).filter((s) => s.id !== substitution.id)]);
    setSelectedId(substitution.id);
    setDialogOpen(false);
    toast.success(t("registeredToast", { name: nameOf(substitution.substitute) }));
  };

  const remove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await deleteDirectionSubstitution(removing.id);
      setSubstitutions((prev) => (prev ?? []).filter((s) => s.id !== removing.id));
      toast.success(t("removedToast"));
      setRemoving(null);
    } catch {
      toast.error(t("removeError"));
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {membersError && members.length === 0 && <LoadError className="mb-4" onRetry={loadMembers} />}
      {loadFailed && <LoadError className="mb-4" onRetry={load} />}

      <div className={cn("grid gap-4 sm:gap-6", selected && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
        <Card className="gap-4 self-start px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 className="text-base font-semibold text-foreground">{t("absencesTitle")}</h2>
            <Button type="button" size="sm" disabled={activeMembers.length < 2} onClick={() => setDialogOpen(true)}>
              {t("register")}
            </Button>
          </div>

          {substitutions === null && !loadFailed ? (
            <div className="flex justify-center py-6">
              <Loader2 aria-hidden className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <EmptyState size="inline" icon={UserRoundCog} title={t("emptyAbsences")} />
          ) : (
            <ul className="-mx-3 flex flex-col gap-1">
              {list.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={s.id === selected?.id || undefined}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      s.id === selected?.id ? "bg-primary/10" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{nameOf(s.absent)}</span>
                      <span className="block text-sm text-muted-foreground">
                        {t("absenceSummary", { day: formatDay(s.date, locale), count: s.lessons.length })}
                      </span>
                    </span>
                    {s.lessons.length > 0 ? (
                      <Pill className={STATE_CLASSES.on_track}>{t("covered")}</Pill>
                    ) : (
                      <Pill className="bg-muted text-muted-foreground">{t("noLessonsPill")}</Pill>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected && (
          <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="text-sm text-muted-foreground">
                {t("coveredBy", { absent: nameOf(selected.absent), name: nameOf(selected.substitute) })}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setRemoving(selected)}>
                {t("remove")}
              </Button>
            </div>
            {selected.lessons.length === 0 ? (
              <Card className="px-4 py-5 sm:px-6">
                <p className="text-foreground">{t("noLessons", { name: nameOf(selected.absent) })}</p>
              </Card>
            ) : (
              selected.lessons.map((lesson) => (
                <LessonCard key={lesson.slotId} lesson={lesson} substituteName={nameOf(selected.substitute)} />
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <AbsenceForm members={activeMembers} onRegistered={register} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => void remove()}
        isLoading={removeBusy}
        variant="danger"
        title={t("removeConfirmTitle")}
        description={removing ? t("removeConfirmDescription", { name: nameOf(removing.substitute) }) : undefined}
        confirmLabel={t("remove")}
      />
    </PageContainer>
  );
}
