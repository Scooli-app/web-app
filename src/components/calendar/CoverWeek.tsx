"use client";

import { ClassHistory } from "@/components/school/direction/ClassHistory";
import { formatClass, formatSubject } from "@/components/school/direction/format";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMyCovers } from "@/services/api/school-direction.service";
import type { DirectionHandoverLesson, DirectionSubstitution } from "@/shared/types/school-direction";
import { addDays, toIntlLocale, toIso } from "@/shared/utils/calendar";
import type { Locale } from "@/i18n/locales";
import { UserRoundCog } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Cover = { substitution: DirectionSubstitution; lesson: DirectionHandoverLesson };

/**
 * The lessons the teacher covers this week for absent colleagues, as the school's direction registered them.
 * Read-only: the class's recent lessons and how they went, never the colleague's documents. Renders nothing when
 * there are none (or they could not be loaded: the teacher's own calendar must not break over it).
 */
export function CoverWeek({ weekStart }: { weekStart: Date }) {
  const t = useTranslations("calendar.covers");
  const locale = useLocale();
  const [covers, setCovers] = useState<Cover[]>([]);
  const [open, setOpen] = useState<Cover | null>(null);
  const from = toIso(weekStart);
  const to = toIso(addDays(weekStart, 6));

  useEffect(() => {
    let live = true;
    getMyCovers(from, to)
      .then((list) => {
        if (live) setCovers(list.flatMap((substitution) => substitution.lessons.map((lesson) => ({ substitution, lesson }))));
      })
      .catch(() => live && setCovers([]));
    return () => {
      live = false;
    };
  }, [from, to]);

  if (covers.length === 0) return null;

  const dayLabel = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(toIntlLocale(locale as Locale), {
      weekday: "short",
      day: "numeric",
    });
  const nameOf = (s: DirectionSubstitution) => s.absent.name || s.absent.email || "—";
  const heading = (l: DirectionHandoverLesson) =>
    t("lessonHeading", {
      class: formatClass(l.grade, l.classLabel, locale),
      subject: formatSubject(l.subjectLabel, l.subjectLabel),
      n: l.sequenceNumber,
    });

  return (
    <section aria-labelledby="cover-week-title" className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <h2 id="cover-week-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserRoundCog aria-hidden className="size-4 text-primary" />
        {t("title")}
      </h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {covers.map((cover) => (
          <li key={cover.lesson.slotId}>
            <button
              type="button"
              onClick={() => setOpen(cover)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                {dayLabel(cover.substitution.date)}
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{heading(cover.lesson)}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t("for", { name: nameOf(cover.substitution) })}
                {cover.lesson.topicTitle ? ` · ${cover.lesson.topicTitle}` : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{heading(open.lesson)}</DialogTitle>
                <DialogDescription>
                  {t("description", { name: nameOf(open.substitution) })}
                  {open.substitution.absent.email && (
                    <>
                      {" "}
                      <a className="text-primary underline-offset-2 hover:underline" href={`mailto:${open.substitution.absent.email}`}>
                        {open.substitution.absent.email}
                      </a>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 px-6 pb-6">
                {open.lesson.topicTitle && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("topic")}</p>
                    <p className="font-medium text-foreground">{open.lesson.topicTitle}</p>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("history")}</p>
                  <ClassHistory history={open.lesson.history} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
