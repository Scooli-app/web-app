"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Routes } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { selectWorkspaceContext } from "@/store/workspace/selectors";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: Routes.SCHOOL_LEARNING, key: "schoolLearning" },
  { href: Routes.SCHOOL_ASSESSMENTS, key: "schoolAssessments" },
  { href: Routes.SCHOOL_SUBSTITUTIONS, key: "schoolSubstitutions" },
  { href: Routes.SCHOOL_REPORTS, key: "schoolReports" },
] as const;

const MANAGE = [
  { href: Routes.SCHOOL_MEMBERS, key: "schoolMembers" },
  { href: Routes.SCHOOL_USAGE, key: "schoolUsage" },
  { href: Routes.SCHOOL_SETTINGS, key: "schoolSettings" },
] as const;

const tabClass = (active: boolean) =>
  cn(
    "-mb-px inline-flex shrink-0 items-center gap-1 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
    active
      ? "border-primary text-primary"
      : "border-transparent text-muted-foreground hover:text-foreground",
  );

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
      {children}
    </Link>
  );
}

/** The school area's own header: whose school this is, and its pages as tabs. Only with class_state_enabled. */
export function SchoolAreaNav() {
  const t = useTranslations("schoolDirection.area");
  const tNav = useTranslations("nav.items");
  const pathname = usePathname();
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const schoolName = useAppSelector(selectWorkspaceContext)?.organization?.name;

  if (!enabled) return null;

  return (
    <PageContainer size="xl" contentClassName="pt-2 sm:pt-4" className="print:hidden">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("label")}</p>
      {schoolName && <p className="mt-0.5 text-lg font-semibold tracking-tight">{schoolName}</p>}
      <nav
        aria-label={t("label")}
        className="mt-3 flex items-end overflow-x-auto border-b border-border [scrollbar-width:none]"
      >
        <Tab href={Routes.SCHOOL} active={pathname === Routes.SCHOOL}>
          {t("overviewTab")}
        </Tab>
        {PAGES.map((page) => (
          <Tab key={page.href} href={page.href} active={pathname === page.href}>
            {tNav(`${page.key}.title`)}
          </Tab>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger className={tabClass(MANAGE.some((item) => pathname === item.href))}>
            {t("manage")}
            <ChevronDown className="size-3.5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {MANAGE.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{tNav(`${item.key}.title`)}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </PageContainer>
  );
}
