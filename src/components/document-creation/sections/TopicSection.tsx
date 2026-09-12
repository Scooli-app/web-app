import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FormUpdateFn } from "../types";

interface TopicSectionProps {
  topic: string;
  placeholder: string;
  onUpdate: FormUpdateFn;
}

export function TopicSection({ topic, placeholder, onUpdate }: TopicSectionProps) {
  const t = useTranslations("documentCreation.topic");

  return (
    <Card className="p-4 sm:p-6 md:p-8 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {t("title")} <span className="text-destructive">*</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
        <Input
          value={topic}
          onChange={(e) => onUpdate("topic", e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base bg-muted border-border rounded-xl placeholder:text-muted-foreground"
          aria-label={t("ariaLabel")}
        />
      </div>
    </Card>
  );
}
