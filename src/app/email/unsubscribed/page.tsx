"use client";

import { emailCategory } from "@/app/email/emailCategory";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnsubscribedContent() {
  const t = useTranslations("emailUnsubscribed");
  const searchParams = useSearchParams();
  const invalid = searchParams.get("error") === "invalid";
  // The Pro trial emails have no switch in settings: say they stopped, and open the app.
  const proTrial = !invalid && emailCategory(searchParams.get("category")) === "pro_trial";

  return (
    <AuthLayout>
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {invalid ? (
              <AlertTriangle className="h-7 w-7" aria-hidden />
            ) : (
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            {invalid ? t("invalid") : proTrial ? t("proTrial.done") : t("done")}
          </h1>
          {!invalid && !proTrial && <p className="text-sm leading-6 text-muted-foreground">{t("hint")}</p>}
          <Button asChild>
            <Link href={invalid || proTrial ? "/dashboard" : "/settings#planning"}>
              {invalid || proTrial ? t("openApp") : t("turnOn")}
            </Link>
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function EmailUnsubscribedPage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribedContent />
    </Suspense>
  );
}
