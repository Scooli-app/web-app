"use client";

import { useRouter } from "next/navigation";
import {
  Heart,
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Gift,
  Shield,
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function CheckoutCancelPage() {
  const router = useRouter();
  const t = useTranslations("checkout.cancel");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>

          <h1 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            {t("description")}
          </p>
        </div>

        {/* Value proposition reminder */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-md sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("whatYoureLosingTitle")}
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">
                  {t("unlimitedGenerations.title")}
                </span>
                <p className="text-sm text-muted-foreground">
                  {t("unlimitedGenerations.description")}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">
                  {t("saveTime.title")}
                </span>
                <p className="text-sm text-muted-foreground">
                  {t("saveTime.description")}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">
                  {t("cancelAnytime.title")}
                </span>
                <p className="text-sm text-muted-foreground">
                  {t("cancelAnytime.description")}
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => router.push("/checkout")}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            {t("tryProCta")}
          </button>

          <Link
            href="/dashboard"
            className="w-full border border-border text-foreground bg-background hover:bg-accent px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("continueFree")}
          </Link>
        </div>

        {/* Help section */}
        <div className="bg-muted p-5 rounded-xl">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-foreground font-medium mb-1">
                {t("helpTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t("helpDescription")}
              </p>
              <a
                href="mailto:suporte@scooli.app"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                suporte@scooli.app
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
