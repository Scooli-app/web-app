import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";

/**
 * One block of the create form: a light card with a small heading and no icon tile, so the
 * whole form fits a laptop screen with "Mais opções" closed.
 */
export function FormCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Card className={cn("gap-0 border-border p-3 py-3 shadow-sm sm:p-4", className)}>{children}</Card>;
}

interface FieldHeadingProps {
  title: string;
  required?: boolean;
  optional?: boolean;
  /** Something on the right of the heading (a mode switch, a link). */
  aside?: React.ReactNode;
  id?: string;
  className?: string;
}

export function FieldHeading({ title, required, optional, aside, id, className }: FieldHeadingProps) {
  const t = useTranslations("documentCreation.form");
  return (
    <div className={cn("mb-2 flex min-w-0 items-center justify-between gap-2", className)}>
      <h2 id={id} className="text-sm font-semibold text-foreground">
        {title}
        {required && <span className="ml-0.5 text-destructive">*</span>}
        {optional && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("optional")}</span>}
      </h2>
      {aside}
    </div>
  );
}

/** A setting inside "Mais opções": label on the left, control on the right (stacked on a phone). */
export function OptionRow({
  label,
  alignTop = false,
  children,
}: {
  label: string;
  /** For tall controls (the theme gallery), so the label stays beside the top instead of mid-way down. */
  alignTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[8.5rem_1fr] sm:gap-4",
        alignTop ? "sm:items-start" : "sm:items-center",
      )}
    >
      <span className={cn("text-sm font-medium text-muted-foreground", alignTop && "sm:pt-1.5")}>{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
