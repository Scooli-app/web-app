import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/utils";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface MoreOptionsProps {
  /** What the optional settings are set to right now, shown while collapsed. */
  summary: string;
  /** Opens the panel from outside (e.g. the missing field lives inside it). */
  forceOpen?: boolean;
  /** One OptionRow per setting. */
  children: React.ReactNode;
}

/**
 * The optional creation settings, folded away so the required ones and the Create button stay in
 * view. Same card as the rest of the form; inside, each setting is one labelled row.
 */
export function MoreOptions({ summary, forceOpen = false, children }: MoreOptionsProps) {
  const t = useTranslations("documentCreation.moreOptions");
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;

  return (
    <Card className="gap-0 border-border py-0 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/50 sm:px-4"
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{t("title")}</span>
          {!isOpen && <span className="block truncate text-xs text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
          aria-hidden
        />
      </button>
      {/* Kept mounted while hidden: sections such as the template picker choose their defaults on mount. */}
      <div hidden={!isOpen} className="border-t border-border/60 px-3 sm:px-4">
        {children}
      </div>
    </Card>
  );
}
