"use client";

import { memo, useState, useMemo, useCallback, useEffect } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Routes } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import type { AppDispatch, RootState } from "@/store/store";
import {
  selectSubscription,
  selectUsageStats,
} from "@/store/subscription/selectors";
import {
  fetchSubscription,
  fetchUsage,
} from "@/store/subscription/subscriptionSlice";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { SignInButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import {
  BookOpen,
  FileCheck,
  FileText,
  FolderArchiveIcon,
  HelpCircle,
  Home,
  Menu,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
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
}

// Static navigation arrays - defined outside component to avoid recreating
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
];

const SECONDARY_NAVIGATION: NavItem[] = [
  {
    title: "Definições",
    href: Routes.SETTINGS,
    icon: Settings,
    description: "Configurar a sua conta",
  },
];

// Memoized navigation item component
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
      <Link href={item.href} onClick={onClick} className="w-full" prefetch={false}>
        <SidebarMenuButton
          isActive={isActive}
          className={cn(
            "h-10 px-4",
            isActive
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "hover:bg-accent text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {item.title}
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
});

// Memoized navigation group component
const NavGroup = memo(function NavGroup({
  label,
  items,
  pathname,
  onItemClick,
}: {
  label: string;
  items: readonly NavItem[];
  pathname: string;
  onItemClick?: () => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavMenuItem
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              onClick={onItemClick}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});

// Memoized sidebar content component
const SidebarInnerContent = memo(function SidebarInnerContent({
  pathname,
  onItemClick,
}: {
  pathname: string;
  onItemClick?: () => void;
}) {
  const router = useRouter();
  return (
    <SidebarPrimitive collapsible="icon">
      <SidebarHeader className="flex items-center justify-center border-b border-border px-6 py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-2">
        <Image
          src="/scooli.svg"
          alt="Scooli"
          width={150}
          height={120}
          priority
          className="flex-shrink-0 rounded-lg group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 cursor-pointer"
          onClick={() => router.push(Routes.DASHBOARD)}
        />
      </SidebarHeader>
      <SidebarContent className="py-4">
        <NavGroup
          label="Navegação"
          items={NAVIGATION}
          pathname={pathname}
          onItemClick={onItemClick}
        />

        <Separator className="my-4" />

        <NavGroup
          label="Criação de Conteúdo"
          items={CONTENT_CREATION}
          pathname={pathname}
          onItemClick={onItemClick}
        />

        <Separator className="my-4" />

        <NavGroup
          label="Sistema"
          items={SECONDARY_NAVIGATION}
          pathname={pathname}
          onItemClick={onItemClick}
        />
      </SidebarContent>
    </SidebarPrimitive>
  );
});

function GenerationsIndicator() {
  const { isSignedIn } = useAuth();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchData() {
      try {
        const [usageData, subData] = await Promise.all([
          getUsageStats(),
          getCurrentSubscription(),
        ]);
        setUsage(usageData);
        setSubscription(subData);
      } catch {
        // Silently fail - this is not critical UI
      }
    }

    fetchData();
  }, [isSignedIn]);

  const isFreeUser = !subscription || subscription.planCode === "free";

  if (!isSignedIn || !usage || !isFreeUser) return null;

  const isLow = usage.remaining <= 20;

  return (
    <Link
      href={Routes.SETTINGS}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
        isLow
          ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      )}
    >
      <Sparkles className="w-4 h-4" />
      <span>{usage.remaining}</span>
    </Link>
  );
}

export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const isUpgradeModalOpen = useSelector((state: RootState) => state.ui.isUpgradeModalOpen);

  const handleMobileItemClick = useCallback(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [isMobile]);

  const handleSheetOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
  }, []);

  const handleUpgradeModalChange = useCallback((isOpen: boolean) => {
    dispatch(setUpgradeModalOpen(isOpen));
  }, [dispatch]);

  // Memoize sidebar content to prevent recreation
  const sidebarContent = useMemo(
    () => <SidebarInnerContent pathname={pathname} onItemClick={handleMobileItemClick} />,
    [pathname, handleMobileItemClick]
  );

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Upgrade Modal */}
        <UpgradePlanModal 
          open={isUpgradeModalOpen} 
          onOpenChange={handleUpgradeModalChange} 
        />

        {/* Desktop Sidebar */}
        <div className="hidden md:block h-screen">{sidebarContent}</div>

        {/* Mobile Sidebar */}
        <Sheet open={open} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden mr-2 px-0 text-base hover:bg-accent hover:text-primary"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pl-1 pr-0 pt-10">
            <SheetTitle className="sr-only">Navegação Scooli</SheetTitle>
            <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10">
              {sidebarContent}
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 bg-background w-full border-b border-border">
            <div className="flex items-center gap-2 px-4 justify-between w-full">
              <SidebarTrigger className="hidden md:flex" />
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="default" className="bg-primary hover:bg-primary/90">
                      Entrar
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10"
                      }
                    }}
                  />
                </SignedIn>
              </div>
            </div>
          </header>
          <main
            className={cn(
              "flex-1 overflow-auto w-full bg-accent",
              className
            )}
          >
            <div className="w-full flex flex-col items-center h-full p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
