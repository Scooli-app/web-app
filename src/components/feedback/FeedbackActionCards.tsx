import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useState } from "react";
import { BugReportForm } from "./BugReportForm";
import { FeedbackModal } from "./FeedbackModal";
import { SuggestionForm } from "./SuggestionForm";

interface FeedbackActionCardsProps {
  onFeedbackSubmitted: () => void;
}

export function FeedbackActionCards({
  onFeedbackSubmitted,
}: FeedbackActionCardsProps) {
  const t = useTranslations("feedback.actionCards");
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);

  const handleSuccess = () => {
    setSuggestionOpen(false);
    setBugOpen(false);
    onFeedbackSubmitted();
  };

  return (
    <>
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer border-2 transition-colors hover:border-primary/50 hover:bg-muted/50"
          onClick={() => {
            posthog.capture("feedback_suggestion_opened");
            setSuggestionOpen(true);
          }}
        >
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/20">
              <Lightbulb className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-xl">{t("suggestionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              {t("suggestionDescription")}
            </CardDescription>
            <p className="mt-2 text-sm font-medium text-primary">
              {t("suggestionCta")}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-2 transition-colors hover:border-destructive/50 hover:bg-muted/50"
          onClick={() => {
            posthog.capture("feedback_bug_report_opened");
            setBugOpen(true);
          }}
        >
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
              <Bug className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl">{t("bugTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              {t("bugDescription")}
            </CardDescription>
            <p className="mt-2 text-sm font-medium text-destructive">
              {t("bugCta")}
            </p>
          </CardContent>
        </Card>

      </div>

      <FeedbackModal
        open={suggestionOpen}
        onOpenChange={setSuggestionOpen}
        title={t("suggestionModalTitle")}
        description={t("suggestionModalDescription")}
      >
        <SuggestionForm
          onSuccess={handleSuccess}
          onCancel={() => setSuggestionOpen(false)}
        />
      </FeedbackModal>

      <FeedbackModal
        open={bugOpen}
        onOpenChange={setBugOpen}
        title={t("bugModalTitle")}
        description={t("bugModalDescription")}
      >
        <BugReportForm
          onSuccess={handleSuccess}
          onCancel={() => setBugOpen(false)}
        />
      </FeedbackModal>
    </>
  );
}
