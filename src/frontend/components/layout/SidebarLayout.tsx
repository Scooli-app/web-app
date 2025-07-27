"use client";

import { Button } from "@/frontend/components/ui/button";
import { ScrollArea } from "@/frontend/components/ui/scroll-area";
import { Separator } from "@/frontend/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/frontend/components/ui/sheet";
import {
  SidebarContent,
  SidebarFooter,
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
} from "@/frontend/components/ui/sidebar";
import { useIsMobile } from "@/frontend/hooks/use-mobile";
import {
  BookOpen,
  FileCheck,
  FileText,
  FolderArchiveIcon,
  HelpCircle,
  Home,
  Menu,
  MessageSquare,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Header from "./Header";
import { cn } from "@/shared/utils/utils";
import { Routes } from "@/shared/types/routes";

interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Don't show sidebar on auth pages
  const isAuthPage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/auth");

  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  const navigation = [
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
    {
      title: "AI Assistant",
      href: Routes.AI_ASSISTANT,
      icon: MessageSquare,
      description: "Chat com inteligência artificial",
    },
  ];

  const contentCreation = [
    {
      title: "Planos de Aula",
      href: Routes.LESSON_PLAN,
      icon: BookOpen,
      description: "Criar e editar planos de aula",
    },
    {
      title: "Testes",
      href: Routes.ASSAYS,
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

  const secondaryNavigation = [
    {
      title: "Definições",
      href: Routes.SETTINGS,
      icon: Settings,
      description: "Configurar a sua conta",
    },
  ];

  const sidebarContent = (
    <SidebarPrimitive collapsible="icon">
      <SidebarHeader className="border-b border-[#E4E4E7] px-6 py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#6753FF] rounded-lg flex items-center justify-center flex-shrink-0 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6">
            <span className="text-white font-bold text-sm group-data-[collapsible=icon]:text-xs">
              S
            </span>
          </div>
          <h2 className="text-lg font-semibold text-[#0B0D17] truncate group-data-[collapsible=icon]:hidden">
            Scooli
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-[#6C6F80] uppercase">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setOpen(false)}
                      className="w-full"
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        className={cn(
                          isActive
                            ? "bg-[#6753FF] text-white hover:bg-[#4E3BC0]"
                            : "hover:bg-[#EEF0FF] text-[#2E2F38]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-[#6C6F80] uppercase">
            Criação de Conteúdo
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentCreation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setOpen(false)}
                      className="w-full"
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        className={cn(
                          isActive
                            ? "bg-[#6753FF] text-white hover:bg-[#4E3BC0]"
                            : "hover:bg-[#EEF0FF] text-[#2E2F38]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-[#6C6F80] uppercase">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setOpen(false)}
                      className="w-full"
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        className={cn(
                          isActive
                            ? "bg-[#6753FF] text-white hover:bg-[#4E3BC0]"
                            : "hover:bg-[#EEF0FF] text-[#2E2F38]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#E4E4E7] px-6 py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-2">
        <div className="rounded-lg bg-[#EEF0FF] p-3 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 bg-[#6753FF] rounded-full flex items-center justify-center flex-shrink-0 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6">
              <span className="text-white font-bold text-xs">U</span>
            </div>
            <div className="flex-1 min-w-0 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
              <p className="text-sm font-medium text-[#0B0D17] truncate">
                Utilizador
              </p>
              <p className="text-xs text-[#6C6F80] truncate">
                user@example.com
              </p>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </SidebarPrimitive>
  );

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-screen">{sidebarContent}</div>

        {/* Mobile Sidebar */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="md:hidden mr-2 px-0 text-base hover:bg-[#EEF0FF] hover:text-[#6753FF]"
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
          <header className="flex h-16 shrink-0 items-center gap-2 bg-[#FFFFFF] w-full border-b border-[#E4E4E7]">
            <div className="flex items-center gap-2 px-4 justify-between w-full">
              <SidebarTrigger className="hidden md:flex" />
              <Header />
            </div>
          </header>
          <main
            className={cn(
              "flex-1 overflow-auto w-full bg-[#EEF0FF]",
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
