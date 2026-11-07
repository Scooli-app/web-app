"use client";

import { Button } from "@/components/ui/button";
import { downloadPromoQr, promoQrPreview, type PromoQrFormat } from "@/lib/trialPromo/promoQr";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** Client-side QR of a promo's sign-up link, with PNG (print) and SVG downloads. */
export function PromoQr({ code, signupUrl }: { code: string; signupUrl: string }) {
  const t = useTranslations("adminPromos.qr");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<PromoQrFormat | null>(null);

  useEffect(() => {
    let cancelled = false;
    promoQrPreview(signupUrl)
      .then((url) => {
        if (!cancelled) setPreview(url);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [signupUrl]);

  const download = async (format: PromoQrFormat) => {
    setBusy(format);
    try {
      await downloadPromoQr(code, signupUrl, format);
    } catch {
      toast.error(t("downloadFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not a remote image
        <img
          src={preview}
          alt={t("alt", { code })}
          width={96}
          height={96}
          className="h-24 w-24 rounded-lg border border-border bg-white"
        />
      ) : (
        <div className="h-24 w-24 rounded-lg border border-border bg-muted" aria-hidden />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download("png")}>
          <Download className="mr-2 h-4 w-4" />
          {t("downloadPng")}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download("svg")}>
          <Download className="mr-2 h-4 w-4" />
          {t("downloadSvg")}
        </Button>
      </div>
    </div>
  );
}
