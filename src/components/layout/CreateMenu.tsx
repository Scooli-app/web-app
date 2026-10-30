"use client";

import { useVisibleDocTypeActions } from "@/components/document-creation/documentTypeActions";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

/** The sidebar's single entry point for starting a new document of any type, as an accordion. */
export function CreateMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  // Planificações already have their own sidebar entry.
  const actions = useVisibleDocTypeActions().filter((a) => a.id !== "curriculumPlan");
  const [expanded, setExpanded] = useState(false);

  return (
    <SidebarMenu className="px-2">
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-expanded={expanded}
          onClick={() => {
            // Warm the routes on open so the click below lands instantly.
            if (!expanded) actions.forEach((a) => router.prefetch(a.route));
            setExpanded((v) => !v);
          }}
          className="h-10 px-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          <span className="flex-1 group-data-[collapsible=icon]:hidden">{t("create")}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden",
              expanded && "rotate-180",
            )}
          />
        </SidebarMenuButton>
        {expanded && (
          <div className="mt-1 space-y-0.5 pl-3 group-data-[collapsible=icon]:hidden">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <SidebarMenuButton
                  key={action.id}
                  onClick={() => {
                    posthog.capture("sidebar_create_clicked", { action: action.id });
                    onNavigate?.();
                    router.push(action.route);
                  }}
                  className="h-9 gap-2.5 px-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {tEnums(`documentType.${action.id}`)}
                </SidebarMenuButton>
              );
            })}
          </div>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
