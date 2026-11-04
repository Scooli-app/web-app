"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/ui/load-error";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDirectionHandover } from "@/services/api/school-direction.service";
import type { OrganizationMember } from "@/shared/types";
import type { DirectionHandover } from "@/shared/types/school-direction";
import { addDays, toIso } from "@/shared/utils/calendar";
import { cn } from "@/shared/utils/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectWorkspaceContext, selectWorkspaceError, selectWorkspaceMembers } from "@/store/workspace/selectors";
import { fetchOrganizationMembers } from "@/store/workspace/workspaceSlice";
import { useUser } from "@clerk/nextjs";
import { FileText, Loader2, UserRoundCog } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { parseAbsences, type Absence } from "./absences";
import { formatClass, formatDay, formatSubject } from "./format";
import { STATE_CLASSES } from "./StatePill";

// Scoped to the school and the signed-in person, so a shared browser tab never shows another account's absences.
const storageKeyFor = (orgId: string, userId: string) => `scooli.direction.absences:${orgId}:${userId}`;

// Read at first render, which only happens client-side: the board mounts after DirectionGate has the flags.
function readAbsences(storageKey: string | null): Absence[] {
  if (!storageKey) return [];
  try {
    return parseAbsences(JSON.parse(sessionStorage.getItem(storageKey) ?? "[]"));
  } catch {
    return [];
  }
}

function writeAbsences(storageKey: string | null, absences: Absence[]) {
  if (!storageKey) return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(absences));
  } catch {
    // Private window or full storage: the list still works until the page is closed.
  }
}

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
  onRegistered: (absence: Absence) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("schoolDirection.substitutions.dialog");
  const tSchool = useTranslations("school");
  const locale = useLocale();
  const { user } = useUser();
  const [teacherId, setTeacherId] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [date, setDate] = useState<Date | undefined>(() => addDays(new Date(), 1));
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
  // The director is not the one who is absent; the member list has no "me", so match on the account's emails.
  const myEmails = (user?.emailAddresses ?? []).map((e) => e.emailAddress.toLowerCase());
  const teachers = members.filter((m) => !m.email || !myEmails.includes(m.email.toLowerCase())).sort(byName);
  const substitutes = members.filter((m) => m.userId !== teacherId).sort(byName);
  const teacher = members.find((m) => m.userId === teacherId);
  const substitute = members.find((m) => m.userId === substituteId);

  const submit = async () => {
    if (!teacher || !substitute || !date) return;
    const iso = toIso(date);
    setSubmitting(true);
    setFailed(false);
    try {
      const handover = await getDirectionHandover(teacher.userId, iso);
      if (!mounted.current) return;
      onRegistered({
        id: `${teacher.userId}|${iso}`,
        teacherName: nameOf(teacher),
        substituteName: nameOf(substitute),
        date: iso,
        handover,
        sent: [],
      });
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

function LessonCard({
  lesson,
  substituteName,
  sent,
  onSend,
}: {
  lesson: DirectionHandover["lessons"][number];
  substituteName: string;
  sent: boolean;
  onSend: () => void;
}) {
  const t = useTranslations("schoolDirection.substitutions");
  const locale = useLocale();
  const { lastLesson: last, documents } = lesson;
  // The handover carries the subject as typed only; formatSubject translates the known ones.
  const subject = formatSubject(lesson.subjectLabel, lesson.subjectLabel);
  const status = last && (t.has(`status.${last.teachingStatus}`) ? t(`status.${last.teachingStatus}`) : last.teachingStatus);

  return (
    <Card className="gap-4 px-4 py-5 sm:px-6">
      <div>
        <Pill className={sent ? STATE_CLASSES.on_track : "bg-primary/10 text-primary"}>
          {sent ? t("sent") : t("ready")}
        </Pill>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("lessonHeading", {
            class: formatClass(lesson.grade, lesson.classLabel, locale),
            subject,
            n: lesson.sequenceNumber,
          })}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("substitute", { name: substituteName })}</p>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("leftOff")}</p>
        {last ? (
          <>
            <p className="mt-1.5 text-sm font-medium text-foreground">
              {[formatDay(last.date, locale), last.topicTitle, status].filter(Boolean).join(" · ")}
            </p>
            {last.note && <p className="mt-1 whitespace-pre-line text-sm text-foreground">“{last.note}”</p>}
          </>
        ) : (
          <p className="mt-1.5 text-sm text-foreground">{t("leftOffNone")}</p>
        )}
      </div>

      {lesson.topicTitle && (
        <div>
          <p className="text-sm text-muted-foreground">{t("topic")}</p>
          <p className="font-medium text-foreground">{lesson.topicTitle}</p>
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground">{t("documents")}</p>
        {documents.length > 0 ? (
          // Titles only: opening a document through the API is the owner's, and can start work on it.
          <ul className="mt-1 divide-y divide-border/60">
            {documents.map((doc, i) => (
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

      <div>
        <Button type="button" disabled={sent} onClick={onSend} className="max-w-full">
          <span className="min-w-0 truncate">{t("send", { name: substituteName })}</span>
        </Button>
      </div>
    </Card>
  );
}

/** A director's cover sheet for absent teachers. The class context is real; the absences and the "send" are not stored or sent. */
export function SubstitutionsBoard() {
  const orgId = useAppSelector(selectWorkspaceContext)?.organization?.id;
  const { user } = useUser();
  // Without both ids nothing is read or written; the board remounts once they are known, so it reads then.
  const storageKey = orgId && user?.id ? storageKeyFor(orgId, user.id) : null;
  return <Board key={storageKey ?? "none"} storageKey={storageKey} />;
}

function Board({ storageKey }: { storageKey: string | null }) {
  const t = useTranslations("schoolDirection.substitutions");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectWorkspaceMembers);
  const membersError = useAppSelector(selectWorkspaceError);
  const [absences, setAbsences] = useState<Absence[]>(() => readAbsences(storageKey));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadMembers = useCallback(() => void dispatch(fetchOrganizationMembers()), [dispatch]);
  useEffect(loadMembers, [loadMembers]);
  useEffect(() => writeAbsences(storageKey, absences), [storageKey, absences]);

  const activeMembers = members.filter((m) => m.status === "active");
  const selected = absences.find((a) => a.id === selectedId) ?? absences[0];

  const register = (absence: Absence) => {
    setAbsences((prev) => [absence, ...prev.filter((a) => a.id !== absence.id)]);
    setSelectedId(absence.id);
    setDialogOpen(false);
  };

  const send = (absence: Absence, slotId: string) => {
    setAbsences((prev) => prev.map((a) => (a.id === absence.id ? { ...a, sent: [...a.sent, slotId] } : a)));
    toast.success(t("sentToast", { name: absence.substituteName }));
  };

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {membersError && members.length === 0 && <LoadError className="mb-4" onRetry={loadMembers} />}

      <div className={cn("grid gap-4 sm:gap-6", selected && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
        <Card className="gap-4 self-start px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 className="text-base font-semibold text-foreground">{t("absencesTitle")}</h2>
            <Button type="button" size="sm" disabled={activeMembers.length === 0} onClick={() => setDialogOpen(true)}>
              {t("register")}
            </Button>
          </div>

          {absences.length === 0 ? (
            <EmptyState size="inline" icon={UserRoundCog} title={t("emptyAbsences")} />
          ) : (
            <ul className="-mx-3 flex flex-col gap-1">
              {absences.map((absence) => (
                <li key={absence.id}>
                  <button
                    type="button"
                    aria-current={absence.id === selected?.id || undefined}
                    onClick={() => setSelectedId(absence.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      absence.id === selected?.id ? "bg-primary/10" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{absence.teacherName}</span>
                      <span className="block text-sm text-muted-foreground">
                        {t("absenceSummary", {
                          day: formatDay(absence.date, locale),
                          count: absence.handover.lessons.length,
                        })}
                      </span>
                    </span>
                    <Pill className={STATE_CLASSES.on_track}>{t("covered")}</Pill>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected && (
          <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
            {selected.handover.lessons.length === 0 ? (
              <Card className="px-4 py-5 sm:px-6">
                <p className="text-foreground">{t("noLessons", { name: selected.teacherName })}</p>
              </Card>
            ) : (
              selected.handover.lessons.map((lesson) => (
                <LessonCard
                  key={lesson.slotId}
                  lesson={lesson}
                  substituteName={selected.substituteName}
                  sent={selected.sent.includes(lesson.slotId)}
                  onSend={() => send(selected, lesson.slotId)}
                />
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
    </PageContainer>
  );
}
