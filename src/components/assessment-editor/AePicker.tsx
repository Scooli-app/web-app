"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/utils/utils";
import type { AeOutcome } from "@/types/assessment";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PHONE_TOUCH } from "./context";
import { MAX_AE_PER_EXERCISE } from "./model";

interface AePickerProps {
  /** Null when the document has no subject/year to search by. */
  search: ((q: string) => Promise<AeOutcome[]>) | null;
  selectedIds: string[];
  onPick: (outcome: AeOutcome) => void;
}

export function AePicker({ search, selectedIds, onPick }: AePickerProps) {
  const t = useTranslations("assessmentEditor.ae");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AeOutcome[] | null>(null);
  const [error, setError] = useState(false);
  const full = selectedIds.length >= MAX_AE_PER_EXERCISE;

  useEffect(() => {
    if (!open || !search) return;
    let cancelled = false;
    setResults(null);
    setError(false);
    const timer = setTimeout(() => {
      search(q.trim())
        .then((rows) => !cancelled && setResults(rows.filter((r) => !r.retired)))
        .catch(() => !cancelled && setError(true));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, q, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 rounded-full px-2.5 text-xs" disabled={full} title={full ? t("limit") : undefined}>
          <Plus className="h-3.5 w-3.5" />
          {t("add")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-[min(24rem,calc(100vw-2rem))] p-2", PHONE_TOUCH)}>
        {!search ? (
          <p className="p-2 text-sm text-muted-foreground">{t("needsContext")}</p>
        ) : (
          <>
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="h-9" />
            <div className="mt-2 max-h-72 overflow-y-auto">
              {error ? (
                <p className="p-2 text-sm text-destructive">{t("searchError")}</p>
              ) : results === null ? (
                <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : results.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">{t("noResults")}</p>
              ) : (
                <ul className="flex flex-col">
                  {results.map((r) => {
                    const picked = selectedIds.includes(r.id);
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          disabled={picked}
                          onClick={() => {
                            onPick(r);
                            setOpen(false);
                          }}
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
                        >
                          <span className="block text-[11px] font-medium text-muted-foreground">{r.topicLeaf}</span>
                          {r.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
