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
} from "@/frontend/components/ui/sidebar";
import { useIsMobile } from "@/frontend/hooks/use-mobile";
import { cn } from "@/shared/utils/utils";
import {
  BookOpen,
  FileCheck,
  FileText,
  HelpCircle,
  Home,
  Menu,
  MessageSquare,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarProps extends React.ComponentProps<typeof SidebarPrimitive> {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  className,
  collapsed = false,
  onCollapsedChange: _onCollapsedChange,
  ...props
}: SidebarProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      description: "Visão geral da sua atividade",
    },
    {
      title: "Documentos",
      href: "/documents",
      icon: FileText,
      description: "Gerir os seus documentos",
    },
  ];

  const contentCreation = [
    {
      title: "Planos de Aula",
      href: "/lesson-plan",
      icon: BookOpen,
      description: "Criar e editar planos de aula",
    },
    {
      title: "Testes",
      href: "/test",
      icon: FileCheck,
      description: "Criar e editar testes",
    },
    {
      title: "Quizzes",
      href: "/quiz",
      icon: HelpCircle,
      description: "Criar e editar quizzes",
    },
  ];

  const community = [
    {
      title: "Comunidade",
      href: "/community",
      icon: Users,
      description: "Partilhar e descobrir recursos",
    },
    {
      title: "AI Assistant",
      href: "/ai-assistant",
      icon: MessageSquare,
      description: "Chat com inteligência artificial",
    },
    {
      title: "Gerador Rápido",
      href: "/quick-generator",
      icon: Zap,
      description: "Criar recursos rapidamente",
    },
  ];

  const secondaryNavigation = [
    {
      title: "Definições",
      href: "/settings",
      icon: Settings,
      description: "Configurar a sua conta",
    },
  ];

  const sidebarContent = (
    <SidebarPrimitive
      className={cn("pb-12", className)}
      {...props}
      data-collapsed={collapsed}
    >
      <SidebarHeader className="border-b border-[#E4E4E7] px-6 py-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#6753FF] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          {!collapsed && (
            <h2 className="text-lg font-semibold text-[#0B0D17]">Scooli</h2>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-[#6C6F80] uppercase">
              Navegação
            </SidebarGroupLabel>
          )}
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
                        tooltip={collapsed ? item.title : undefined}
                        className={cn(
                          isActive
                            ? "bg-[#6753FF] text-white hover:bg-[#4E3BC0]"
                            : "hover:bg-[#EEF0FF] text-[#2E2F38]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && item.title}
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
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-[#6C6F80] uppercase">
              Criação de Conteúdo
            </SidebarGroupLabel>
          )}
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
                        tooltip={collapsed ? item.title : undefined}
                        className={cn(
                          isActive
                            ? "bg-[#6753FF] text-white hover:bg-[#4E3BC0]"
                            : "hover:bg-[#EEF0FF] text-[#2E2F38]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && item.title}
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
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-[#6C6F80] uppercase">
              Comunidade
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {community.map((item) => {
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
                        tooltip={collapsed ? item.title : undefined}
                        className={cn(
                          isActive
                            ? "bg-[#6753FF] text-white hover:bg-[#4E3BC0]"
                            : "hover:bg-[#EEF0FF] text-[#2E2F38]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && item.title}
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
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-xs font-semibold tracking-tight text-[#6C6F80] uppercase">
              Sistema
            </SidebarGroupLabel>
          )}
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
                        tooltip={collapsed ? item.title : undefined}
                        className={cn(
                          isActive
                            ? "bg-[#6753FF] text-white hover:bg-[#4E3BC0]"
                            : "hover:bg-[#EEF0FF] text-[#2E2F38]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && item.title}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="border-t border-[#E4E4E7] px-6 py-4">
          <div className="rounded-lg bg-[#EEF0FF] p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#6753FF] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">U</span>
              </div>
              <div className="flex-1 min-w-0">
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
      )}
    </SidebarPrimitive>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="mr-2 px-0 text-base hover:bg-[#EEF0FF] hover:text-[#6753FF] md:hidden"
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
    );
  }

  return sidebarContent;
}
