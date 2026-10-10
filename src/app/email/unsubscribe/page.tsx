"use client";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Loader2, MailX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const INVALID_URL = "/email/unsubscribed?error=invalid";
const DONE_URL = "/email/unsubscribed?category=weekly_digest";

function UnsubscribeContent() {
  const t = useTranslations("emailUnsubscribe");
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [busy, setBusy] = useState(false);

  // A missing token can never succeed: show the invalid state straight away.
  useEffect(() => {
    if (!token) router.replace(INVALID_URL);
  }, [token, router]);

  const confirm = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const base = process.env.NEXT_PUBLIC_BASE_API_URL || "";
      const response = await fetch(
        `${base}/email/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      router.replace(response.ok ? DONE_URL : INVALID_URL);
    } catch {
      router.replace(INVALID_URL);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailX className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{t("hint")}</p>
          <Button onClick={confirm} disabled={busy || !token}>
            {busy && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {busy ? t("confirming") : t("confirm")}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function EmailUnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeContent />
    </Suspense>
  );
}
