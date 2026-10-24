"use client";

import { InlineText } from "@/components/blocks/inline-text";
import { useTranslations } from "next-intl";
import { exerciseNumbers, parseAssessment } from "./model";

/** Read-only outline of a stored assessment version for the versions sheet: Grupos and numbered prompts. */
export function AssessmentVersionPreview({ content }: { content: string }) {
  const t = useTranslations("assessmentEditor");
  const doc = parseAssessment(content);
  if (!doc || doc.sections.every((s) => s.items.length === 0)) {
    return <p className="text-sm text-muted-foreground">{t("versionPreviewEmpty")}</p>;
  }
  const numbers = exerciseNumbers(doc);
  return (
    <div className="flex max-h-[50dvh] flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-background p-4 text-sm text-foreground">
      {doc.sections.map((s) => (
        <div key={s.id}>
          <p className="mb-1.5 font-semibold">{s.title}</p>
          <ol className="flex flex-col gap-1">
            {s.items.map((i) => (
              <li key={i.id} className="flex gap-2">
                {i.kind === "exercise" ? (
                  <>
                    <span className="shrink-0 font-semibold">{numbers.get(i.id)}.</span>
                    <span className="min-w-0"><InlineText value={i.prompt} /></span>
                  </>
                ) : (
                  <span className="italic text-muted-foreground">{i.title || t("item.readingDefaultTitle")}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
