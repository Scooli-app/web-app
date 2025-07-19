"use client";

import { 
  SidebarProvider, 
  SidebarTrigger,
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
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

interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Don't show sidebar on auth pages
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname?.startsWith("/auth");

  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>;
  }

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
    {
      title: "Planos de Aula",
      href: "/lesson-plan",
      icon: BookOpen,
      description: "Criar e editar planos de aula",
    },
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
    <SidebarPrimitive collapsible="icon" className="pb-12">
      <SidebarHeader className="border-b border-[#E4E4E7] px-6 py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#6753FF] rounded-lg flex items-center justify-center flex-shrink-0 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6">
            <span className="text-white font-bold text-sm group-data-[collapsible=icon]:text-xs">S</span>
          </div>
          <h2 className="text-lg font-semibold text-[#0B0D17] truncate group-data-[collapsible=icon]:hidden">Scooli</h2>
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
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          {sidebarContent}
        </div>
        
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
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="hidden md:flex" />
            </div>
          </header>
          <main className={cn("flex-1 overflow-auto w-full", className)}>
            <div className="w-full max-w-4xl mx-auto px-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
} 