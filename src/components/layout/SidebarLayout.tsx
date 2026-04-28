"use client";

import { AssistantProvider } from "@/components/assistant";
import { AppFeedbackSurveyGate } from "@/components/feedback-survey/AppFeedbackSurveyGate";
import { AppBootstrapGate } from "@/components/layout/AppBootstrapGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarPrimitive,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UpgradePlanModal } from "@/components/ui/upgrade-plan-modal";
import { useAdmin } from "@/hooks/useAdmin";
import { MARKETING_SITE_URL } from "@/shared/config/constants";
import { Routes } from "@/shared/types";
import { FeatureFlag } from "@/shared/types/featureFlags";
import { cn } from "@/shared/utils/utils";
import {
  selectEffectiveAccessSource,
  selectEntitlementUsage,
} from "@/store/entitlements/selectors";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { selectIsPro } from "@/store/subscription/selectors";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import {
  selectHasOrganizationWorkspace,
  selectIsOrganizationAdmin,
  selectWorkspaceContext,
} from "@/store/workspace/selectors";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/nextjs";
import {
  BookOpen,
  Building2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  FolderArchiveIcon,
  HelpCircle,
  Home,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Presentation,
  Settings,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  external?: boolean;
}

const NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    href: Routes.DASHBOARD,
    icon: Home,
    description: "Visão geral da sua atividade",
  },
  {
    title: "Os meus documentos",
    href: Routes.DOCUMENTS,
    icon: FileText,
    description: "Gerir os seus documentos",
  },
  {
    title: "Biblioteca comunitária",
    href: Routes.COMMUNITY,
    icon: FolderArchiveIcon,
    description: "Partilhar e descobrir recursos",
  },
];

const CONTENT_CREATION: NavItem[] = [
  {
    title: "Planos de Aula",
    href: Routes.LESSON_PLAN,
    icon: BookOpen,
    description: "Criar e editar planos de aula",
  },
  {
    title: "Testes",
    href: Routes.TEST,
    icon: FileCheck,
    description: "Criar e editar testes",
  },
  {
    title: "Quizzes",
    href: Routes.QUIZ,
    icon: HelpCircle,
    description: "Criar e editar quizzes",
  },
  {
    title: "Fichas de Trabalho",
    href: Routes.WORKSHEET,
    icon: ClipboardList,
    description: "Criar e editar fichas de trabalho",
  },
  {
    title: "Apresentações",
    href: Routes.PRESENTATION,
    icon: Presentation,
    description: "Criar e editar apresentações",
  },
];

const SECONDARY_NAVIGATION: NavItem[] = [
  {
    title: "Apoio e sugestões",
    href: Routes.SUPPORT,
    icon: MessageSquare,
    description: "Enviar feedback e reportar erros",
  },
  {
    title: "Definições",
    href: Routes.SETTINGS,
    icon: Settings,
    description: "Configurar a sua conta",
  },
  {
    title: "Recomendar escola",
    href: `${MARKETING_SITE_URL}/recomendar-instituicao`,
    icon: Building2,
    description: "Sugerir a Scooli à direção da sua escola",
    external: true,
  },
];

const ADMIN_NAVIGATION: NavItem[] = [
  {
    title: "Consola Admin",
    href: Routes.ADMIN,
    icon: Shield,
    description: "Gerir plataforma",
  },
];

const SCHOOL_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard Escola",
    href: Routes.SCHOOL,
    icon: Building2,
    description: "Gerir escola, lugares e utilização",
  },
  {
    title: "Membros",
    href: Routes.SCHOOL_MEMBERS,
    icon: Users,
    description: "Ver membros e lugares da escola",
  },
];

const SOURCES_NAV_ITEM: NavItem = {
  title: "As minhas fontes",
  href: Routes.SOURCES,
  icon: Library,
  description: "Gerir fontes de conteúdo para geração",
};

const NavMenuItem = memo(function NavMenuItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <Link
        href={item.href}
        onClick={onClick}
        className="w-full"
        prefetch={false}
      >
        <SidebarMenuButton
          isActive={isActive}
          className={cn(
            "h-10 px-4",
            isActive
              ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
          {item.title}
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
});

const ExternalNavMenuItem = memo(function ExternalNavMenuItem({
  item,
  onClick,
}: {
  item: NavItem;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
        className="w-full"
      >
        <SidebarMenuButton className="h-10 px-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.title}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
        </SidebarMenuButton>
      </a>
    </SidebarMenuItem>
  );
});

const DisabledNavMenuItem = memo(function DisabledNavMenuItem({
  item,
}: {
  item: NavItem;
}) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        disabled
        className="h-auto min-h-10 cursor-not-allowed items-start px-4 py-2 text-sidebar-foreground opacity-50"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="whitespace-normal break-words text-left leading-tight">
            {item.title}
          </p>
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap text-muted-foreground">
            <Clock className="h-2.5 w-2.5 shrink-0" />
            Em breve
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

const NavGroup = memo(function NavGroup({
  label,
  items,
  pathname,
  onItemClick,
  disabledKeys = [],
}: {
  label: string;
  items: readonly NavItem[];
  pathname: string;
  onItemClick?: () => void;
  disabledKeys?: string[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-tight text-muted-foreground">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) =>
            disabledKeys.includes(item.href) ? (
              <DisabledNavMenuItem key={item.href} item={item} />
            ) : item.external ? (
              <ExternalNavMenuItem
                key={item.href}
                item={item}
                onClick={onItemClick}
              />
            ) : (
              <NavMenuItem
                key={item.href}
                item={item}
                isActive={pathname === item.href}
                onClick={onItemClick}
              />
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});

const SidebarProfileCard = memo(function SidebarProfileCard({
  onClick,
}: {
  onClick?: () => void;
}) {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) return null;

  const displayName = user.fullName || user.firstName || "Utilizador";
  const email = user.primaryEmailAddress?.emailAddress || "";
  const fallbackInitial = displayName.charAt(0).toUpperCase();

  const handleClick = () => {
    openUserProfile();
    onClick?.();
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    onClick?.();

    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch (error) {
      console.error("Failed to sign out from sidebar:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-2xl border border-border bg-card/90 p-4 text-left shadow-sm group-data-[collapsible=icon]:hidden">
      <button
        type="button"
        onClick={handleClick}
        className="block w-full rounded-xl transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Abrir perfil"
      >
        <div className="flex items-center gap-3">
          {user.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={displayName}
              width={52}
              height={52}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground">
              {fallbackInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <p className="mt-1 text-xs font-medium text-primary">
              Gerir perfil
            </p>
          </div>
        </div>
      </button>

      <Separator className="my-3" />

      <Button
        type="button"
        onClick={() => void handleSignOut()}
        variant="ghost"
        size="sm"
        disabled={isSigningOut}
        className="h-9 w-full justify-start px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isSigningOut ? "A terminar sessão..." : "Terminar sessão"}
      </Button>
    </div>
  );
});

const SidebarNavigationContent = memo(function SidebarNavigationContent({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const features = useSelector((state: RootState) => state.features.flags);
  const workspace = useSelector(selectWorkspaceContext);
  const hasOrganizationWorkspace = useSelector(selectHasOrganizationWorkspace);
  const isOrganizationAdmin = useSelector(selectIsOrganizationAdmin);
  const isCommunityEnabled = features[FeatureFlag.COMMUNITY_LIBRARY] === true;
  const isPresentationCreationEnabled =
    features[FeatureFlag.PRESENTATION_CREATION] === true;
  const isWorksheetCreationEnabled =
    features[FeatureFlag.WORKSHEET_CREATION] === true;
  const isUserSourcesEnabled = features[FeatureFlag.USER_SOURCES] === true;

  const disabledContentCreationKeys = [
    ...(isWorksheetCreationEnabled ? [] : [Routes.WORKSHEET]),
    ...(isPresentationCreationEnabled ? [] : [Routes.PRESENTATION]),
  ];

  const navigationItems: NavItem[] = [
    ...NAVIGATION,
    ...(isUserSourcesEnabled ? [SOURCES_NAV_ITEM] : []),
  ];

  return (
    <>
      <SidebarHeader className="flex items-center justify-center px-4 py-3 sm:px-6 sm:py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-2">
        <Image
          src="/scooli.svg"
          alt="Scooli"
          width={150}
          height={120}
          priority
          className="h-auto flex-shrink-0 cursor-pointer rounded-lg group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6"
          onClick={() => router.push(Routes.DASHBOARD)}
        />
      </SidebarHeader>
      <SidebarContent className="py-4">
        <NavGroup
          label="Navegação"
          items={navigationItems}
          pathname={pathname}
          onItemClick={onItemClick}
          disabledKeys={isCommunityEnabled ? [] : [Routes.COMMUNITY]}
        />

        <Separator className="my-4" />

        <NavGroup
          label="Criação de Conteúdo"
          items={CONTENT_CREATION}
          pathname={pathname}
          onItemClick={onItemClick}
          disabledKeys={disabledContentCreationKeys}
        />

        <Separator className="my-4" />

        <NavGroup
          label="Sistema"
          items={SECONDARY_NAVIGATION}
          pathname={pathname}
          onItemClick={onItemClick}
        />
        <SignedIn>
          <SidebarProfileCard onClick={onItemClick} />
        </SignedIn>

        {hasOrganizationWorkspace && isOrganizationAdmin && (
          <>
            <Separator className="my-4" />
            <NavGroup
              label={workspace?.organization?.name ?? "Escola"}
              items={SCHOOL_NAVIGATION}
              pathname={pathname}
              onItemClick={onItemClick}
            />
          </>
        )}

        {isAdmin && (
          <>
            <Separator className="my-4" />
            <NavGroup
              label="Administração"
              items={ADMIN_NAVIGATION}
              pathname={pathname}
              onItemClick={onItemClick}
            />
          </>
        )}
      </SidebarContent>
    </>
  );
});

const SidebarDesktopContent = memo(function SidebarDesktopContent({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <SidebarPrimitive collapsible="icon">
      <SidebarNavigationContent pathname={pathname} onItemClick={onItemClick} />
    </SidebarPrimitive>
  );
});

const SidebarMobileContent = memo(function SidebarMobileContent({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <SidebarNavigationContent pathname={pathname} onItemClick={onItemClick} />
    </div>
  );
});

function GenerationsIndicator() {
  const { isSignedIn } = useAuth();

  const usage = useSelector(selectEntitlementUsage);
  const isProUser = useSelector(selectIsPro);
  const accessSource = useSelector(selectEffectiveAccessSource);

  if (!isSignedIn || !usage) return null;

  if (isProUser) {
    return (
      <Link
        href={Routes.SETTINGS}
        title={
          accessSource === "organization" || accessSource === "both"
            ? "Acesso Pro através da organização"
            : "Acesso Pro"
        }
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          "border-primary/10 bg-primary/5 text-primary hover:bg-primary/10",
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-lg leading-none">∞</span>
      </Link>
    );
  }

  const isLow = usage.limit > 0 && usage.remaining / usage.limit <= 0.2;
  const isOut = usage.remaining === 0;

  if (isOut) {
    return (
      <Link href={Routes.CHECKOUT}>
        <Button
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm transition-all hover:scale-105 hover:from-amber-600 hover:to-orange-700 active:scale-95"
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          Atualizar para Pro
        </Button>
      </Link>
    );
  }

  return (
    <Link
      href={Routes.SETTINGS}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        isLow
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400"
          : "border-primary/10 bg-primary/5 text-primary hover:bg-primary/10",
      )}
    >
      <Sparkles className="h-4 w-4" />
      <span>
        {usage.remaining} {usage.remaining === 1 ? "geração" : "gerações"}
      </span>
    </Link>
  );
}

export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isUpgradeModalOpen = useSelector(
    (state: RootState) => state.ui.isUpgradeModalOpen,
  );

  const handleMobileItemClick = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSheetOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
  }, []);

  const handleUpgradeModalChange = useCallback(
    (isOpen: boolean) => {
      dispatch(setUpgradeModalOpen(isOpen));
    },
    [dispatch],
  );

  const desktopSidebarContent = useMemo(
    () => (
      <SidebarDesktopContent
        pathname={pathname}
        onItemClick={handleMobileItemClick}
      />
    ),
    [pathname, handleMobileItemClick],
  );

  const mobileSidebarContent = useMemo(
    () => (
      <SidebarMobileContent
        pathname={pathname}
        onItemClick={handleMobileItemClick}
      />
    ),
    [pathname, handleMobileItemClick],
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full">
        <AppBootstrapGate />
        <UpgradePlanModal
          open={isUpgradeModalOpen}
          onOpenChange={handleUpgradeModalChange}
        />
        <AppFeedbackSurveyGate />

        <div className="hidden md:block md:min-h-dvh">
          {desktopSidebarContent}
        </div>

        <div className="flex flex-1 flex-col">
          <header className="flex h-14 w-full shrink-0 items-center gap-2 border-b border-border bg-background/70 backdrop-blur-md sm:h-16">
            <div className="flex w-full items-center justify-between gap-2 px-3 sm:px-4">
              <div className="flex items-center gap-1">
                <Sheet open={open} onOpenChange={handleSheetOpenChange}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 w-9 px-0 text-base hover:bg-accent hover:text-primary md:hidden"
                    >
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Alternar barra lateral</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-[min(92vw,22rem)] border-r p-0"
                  >
                    <SheetTitle className="sr-only">
                      Navegação Scooli
                    </SheetTitle>
                    <ScrollArea className="h-full py-3">
                      {mobileSidebarContent}
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
                <SidebarTrigger className="hidden md:flex" />
              </div>

              <div className="flex items-center gap-2">
                <SignedIn>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="hidden h-8 rounded border border-dashed border-primary/20 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-wide text-primary sm:inline-flex"
                    >
                      Acesso antecipado
                    </Badge>
                    <div className="hidden sm:block">
                      <GenerationsIndicator />
                    </div>
                  </div>
                </SignedIn>
                <ThemeToggle />
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button
                      variant="default"
                      className="bg-primary hover:bg-primary/90"
                    >
                      Entrar
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </header>

          <main
            className={cn(
              "w-full flex-1 overflow-auto bg-slate-50 dark:bg-background",
              className,
            )}
          >
            <div className="flex h-full w-full flex-col items-center p-3 sm:p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>

        <AssistantProvider />
      </div>
    </SidebarProvider>
  );
}
