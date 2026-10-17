"use client";

import { useVisibleDocTypeActions } from "@/components/document-creation/documentTypeActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

/** The sidebar's single entry point for starting a new document of any type. */
export function CreateMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const actions = useVisibleDocTypeActions();

  return (
    <SidebarMenu className="px-2">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={t("create")}
              className="h-10 justify-center bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[state=open]:bg-primary/90 data-[state=open]:text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">{t("create")}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-56">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.id}
                  onSelect={() => {
                    posthog.capture("sidebar_create_clicked", { action: action.id });
                    onNavigate?.();
                    router.push(action.route);
                  }}
                  className="gap-2.5 py-2"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {tEnums(`documentType.${action.id}`)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
