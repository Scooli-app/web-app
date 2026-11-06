"use client";

import { currentTopic, profileExamplePairs } from "@/components/dashboard/profileExamples";
import { SUBJECTS } from "@/components/document-creation/constants";
import {
  buildQuickCreateUrl,
  parseQuickCreate,
  type QuickCreateParse,
} from "@/components/document-creation/quickCreate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import { getTopicDomains } from "@/services/api/timetable.service";
import { useAppSelector } from "@/store/hooks";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

const EXAMPLE_CHIP_CLASS =
  "rounded-full border border-input bg-card px-2.5 py-1 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent";

interface QuickStartExample {
  id: string;
  labelKey: string;
  /** Topic text comes from `documentCreation.quickStart.<id>.topic` — resolved at render time, not here. */
  parse: Omit<QuickCreateParse, "topic">;
}

const QUICK_START_EXAMPLES: QuickStartExample[] = [
  {
    id: "lesson_plan_fotossintese",
    labelKey: "lessonPlanFotossintese",
    parse: {
      documentType: "lessonPlan",
      schoolYear: 3,
      subjectId: "estudo_meio",
    },
  },
  {
    id: "test_fracoes",
    labelKey: "testFracoes",
    parse: {
      documentType: "test",
      schoolYear: 5,
      subjectId: "matematica",
    },
  },
  {
    id: "quiz_descobrimentos",
    labelKey: "quizDescobrimentos",
    parse: {
      documentType: "quiz",
      schoolYear: 5,
      subjectId: "hgp",
    },
  },
];

/** An example built from what the teacher teaches: the topic usually next at this point of the year. */
interface ProfileExample {
  documentType: "lessonPlan" | "test" | "quiz";
  subjectId: string;
  year: number;
  topic: string;
}

const PROFILE_EXAMPLE_TYPES: ProfileExample["documentType"][] = ["lessonPlan", "test", "quiz"];

/** Examples from the teacher's years and subjects; empty when the profile gives none (the fixed ones show then). */
async function loadProfileExamples(): Promise<ProfileExample[]> {
  const pairs = profileExamplePairs(await teachingProfileService.get());
  const today = new Date();
  const found = await Promise.all(
    pairs.map(async (pair) => {
      const subject = SUBJECTS.find((s) => s.id === pair.subjectId);
      if (!subject) return null;
      const topics = await getTopicDomains(subject.value, pair.year).catch(() => []);
      const topic = currentTopic(
        topics.map((t) => t.label),
        today,
      );
      return topic ? { ...pair, topic } : null;
    }),
  );
  return found
    .filter((example) => example !== null)
    .map((example, index) => ({ ...example, documentType: PROFILE_EXAMPLE_TYPES[index] }));
}

interface QuickCreateCardProps {
  isWorksheetCreationEnabled: boolean;
  /** Examples help a new teacher start; one with turmas already has a week to work from. */
  showExamples?: boolean;
}

export function QuickCreateCard({
  isWorksheetCreationEnabled,
  showExamples = true,
}: QuickCreateCardProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.quickCreate");
  const tQuickStart = useTranslations("documentCreation.quickStart");
  const [text, setText] = useState("");
  // null while loading, so the fixed examples never flash before the teacher's own.
  const [profileExamples, setProfileExamples] = useState<ProfileExample[] | null>(null);
  // The card sits under the onboarding overlay: read the profile once onboarding has saved it.
  const onboardingOpen = useAppSelector((state) => state.ui.isOnboardingModalOpen);

  useEffect(() => {
    if (!showExamples || onboardingOpen) return;
    let cancelled = false;
    loadProfileExamples()
      .catch(() => [])
      .then((examples) => {
        if (!cancelled) setProfileExamples(examples);
      });
    return () => {
      cancelled = true;
    };
  }, [showExamples, onboardingOpen]);

  const handleProfileExampleClick = (example: ProfileExample) => {
    posthog.capture("dashboard_quick_start_clicked", {
      example_id: `profile_${example.documentType}`,
      document_type: example.documentType,
      source: "profile",
    });
    router.push(
      buildQuickCreateUrl({
        documentType: example.documentType,
        topic: example.topic,
        schoolYear: example.year,
        subjectId: example.subjectId,
      }),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const parse = parseQuickCreate(trimmed);
    const requestedType = parse.documentType;
    if (parse.documentType === "worksheet" && !isWorksheetCreationEnabled) {
      parse.documentType = "lessonPlan";
    }

    posthog.capture("dashboard_quick_create_submitted", {
      requested_type: requestedType,
      routed_type: parse.documentType,
      has_year: parse.schoolYear !== undefined,
      has_subject: parse.subjectId !== undefined,
      text_length: trimmed.length,
    });

    router.push(buildQuickCreateUrl(parse));
  };

  const handleExampleClick = (example: QuickStartExample) => {
    const parse: QuickCreateParse = {
      ...example.parse,
      topic: tQuickStart(`${example.id}.topic`),
    };
    posthog.capture("dashboard_quick_start_clicked", {
      example_id: example.id,
      document_type: parse.documentType,
    });
    router.push(buildQuickCreateUrl(parse));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          {t("heading")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("placeholder")}
          className="h-10 w-full rounded-lg placeholder:text-xs sm:flex-1 sm:placeholder:text-sm"
          aria-label={t("inputAriaLabel")}
        />
        <Button
          type="submit"
          disabled={!text.trim()}
          className="h-10 w-full rounded-lg sm:w-auto sm:shrink-0 sm:px-4"
        >
          {t("submit")}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      {showExamples && profileExamples !== null && (
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{t("examplesLabel")}</span>
        {profileExamples.length > 0
          ? profileExamples.map((example) => (
              <button
                key={`${example.documentType}-${example.subjectId}-${example.year}`}
                type="button"
                onClick={() => handleProfileExampleClick(example)}
                className={EXAMPLE_CHIP_CLASS}
              >
                {t("exampleLabel", {
                  type: t(`exampleTypes.${example.documentType}`),
                  topic: example.topic,
                  year: example.year,
                })}
              </button>
            ))
          : QUICK_START_EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => handleExampleClick(example)}
                className={EXAMPLE_CHIP_CLASS}
              >
                {t(`examples.${example.labelKey}`)}
              </button>
            ))}
      </div>
      )}
    </div>
  );
}
