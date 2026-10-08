"use client";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { submitReengagementReason } from "@/services/api/reengagement.service";
import { AlertTriangle, CheckCircle2, Loader2, MessageCircleHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

type Translator = ReturnType<typeof useTranslations>;

function getReasonKeys(): Record<string, string> {
  return {
    confusing: "confusing",
    quality: "quality",
    no_time: "noTime",
    other: "other",
  };
}

function formatReason(reasonKey: string | null, t: Translator): string | null {
  if (!reasonKey) {
    return null;
  }
  const key = getReasonKeys()[reasonKey];
  return key ? t(`reasons.${key}` as Parameters<Translator>[0]) : null;
}

type Status = "idle" | "submitting" | "done" | "error";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
      <div className="space-y-5 text-center">{children}</div>
    </div>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      {children}
    </div>
  );
}

function ReengagementFallback() {
  const t = useTranslations("reengagement");

  return (
    <AuthLayout>
      <Card>
        <IconCircle>
          <Loader2 className="h-7 w-7 animate-spin" />
        </IconCircle>
        <h1 className="text-2xl font-semibold text-foreground">{t("loading")}</h1>
      </Card>
    </AuthLayout>
  );
}

function ReengagementContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const reasonKey = searchParams.get("reason");
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("idle");
  const t = useTranslations("reengagement");

  const reasonLabel = formatReason(reasonKey, t);
  const isValidLink = Boolean(email && reasonKey && token && reasonLabel);

  const handleConfirm = useCallback(async () => {
    if (!email || !reasonKey || !token) {
      return;
    }

    setStatus("submitting");
    try {
      await submitReengagementReason({ email, reason: reasonKey, token });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [email, reasonKey, token]);

  if (!isValidLink) {
    return (
      <AuthLayout>
        <Card>
          <IconCircle>
            <AlertTriangle className="h-7 w-7" />
          </IconCircle>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {t("invalidLink.title")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("invalidLink.description")}
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">{t("openApp")}</Link>
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  if (status === "done") {
    return (
      <AuthLayout>
        <Card>
          <IconCircle>
            <CheckCircle2 className="h-7 w-7" />
          </IconCircle>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {t("done.title")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {t.rich("done.description", {
                strong: (chunks) => (
                  <strong className="text-foreground">{chunks}</strong>
                ),
                reason: reasonLabel ?? "",
              })}
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">{t("openApp")}</Link>
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <IconCircle>
          <MessageCircleHeart className="h-7 w-7" />
        </IconCircle>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("confirm.title")}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {t("confirm.description")}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">{reasonLabel}</p>
        </div>

        {status === "error" && (
          <p className="text-sm text-destructive">
            {t("confirm.error")}
          </p>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={() => void handleConfirm()}
            disabled={status === "submitting"}
          >
            {status === "submitting" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {t("confirm.confirmCta")}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">{t("confirm.notThisCta")}</Link>
          </Button>
        </div>
      </Card>
    </AuthLayout>
  );
}

export default function ReengagementPage() {
  return (
    <Suspense fallback={<ReengagementFallback />}>
      <ReengagementContent />
    </Suspense>
  );
}
