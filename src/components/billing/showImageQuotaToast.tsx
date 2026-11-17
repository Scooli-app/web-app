"use client";

import { ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

/**
 * The AI image cap ran out on "Gerar imagem" / "Regenerar". A custom toast in the same look as AiImageQuotaNotice:
 * the app's default toast (solid primary) reads like an error and is hard to read with two sentences.
 */
export function showImageQuotaToast(title: string, description: string, closeLabel: string) {
  toast.custom(
    (id) => (
      <div
        role="status"
        className="flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm shadow-lg dark:border-amber-900/60 dark:bg-amber-950"
      >
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          aria-label={closeLabel}
          className="rounded p-1 text-muted-foreground hover:bg-amber-100 hover:text-foreground dark:hover:bg-amber-900/40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    ),
    // unstyled: no primary background/border from the Toaster's defaults around this card.
    { duration: 12000, unstyled: true, style: { background: "transparent", border: "none", padding: 0 } },
  );
}
