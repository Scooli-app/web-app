"use client";

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
import { useIsMobile } from "@/hooks/use-mobile";
import { Routes } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import {
  BookOpen,
  FileCheck,
  FileText,
  FolderArchiveIcon,
  HelpCircle,
  Home,
  Menu,
  Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
      <SidebarHeader className="flex items-center justify-center border-b border-[#E4E4E7] px-6 py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-2">
        <Image
          src="/scooli.svg"
          alt="Scooli"
          width={150}
          height={120}
          className="flex-shrink-0 rounded-lg group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6"
        />
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
