"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { useMemo } from "react";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ClerkThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useSelector((state: RootState) => state.ui.theme);

  const appearance = useMemo(() => {
    const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
    const isDark = effectiveTheme === "dark";

    return {
      baseTheme: isDark ? dark : undefined,
      variables: {
        colorPrimary: "#6753FF",
        colorTextOnPrimaryBackground: "#FFFFFF",
        borderRadius: "0.75rem",
      },
      elements: {
        card: isDark ? "bg-[#1A1D26] border-[#333845]" : "",
        headerTitle: isDark ? "text-white" : "",
        headerSubtitle: isDark ? "text-gray-400" : "",
        socialButtonsBlockButton: isDark
          ? "bg-[#252833] border-[#333845] text-white hover:bg-[#2f3340]"
          : "",
        formFieldInput: isDark
          ? "bg-[#252833] border-[#333845] text-white"
          : "",
        formButtonPrimary:
          "bg-[#6753FF] hover:bg-[#5a47e6] text-white",
        footerActionLink: "text-[#7B6AFF] hover:text-[#6753FF]",
        identityPreview: isDark ? "bg-[#252833] border-[#333845]" : "",
        identityPreviewText: isDark ? "text-white" : "",
        identityPreviewEditButton: isDark ? "text-[#7B6AFF]" : "",
        userButtonPopoverCard: isDark ? "bg-[#1A1D26] border-[#333845]" : "",
        userButtonPopoverActionButton: isDark
          ? "text-white hover:bg-[#252833]"
          : "",
        userButtonPopoverActionButtonText: isDark ? "text-white" : "",
        userButtonPopoverActionButtonIcon: isDark ? "text-gray-400" : "",
        userButtonPopoverFooter: isDark ? "border-[#333845]" : "",
        userPreviewMainIdentifier: isDark ? "text-white" : "",
        userPreviewSecondaryIdentifier: isDark ? "text-gray-400" : "",
        profileSectionTitle: isDark ? "text-white border-[#333845]" : "",
        profileSectionTitleText: isDark ? "text-white" : "",
        profileSectionContent: isDark ? "text-gray-300" : "",
        profileSectionPrimaryButton: "text-[#7B6AFF]",
        formFieldLabel: isDark ? "text-gray-300" : "",
        formFieldHintText: isDark ? "text-gray-400" : "",
        accordionTriggerButton: isDark ? "text-white" : "",
        accordionContent: isDark ? "text-gray-300" : "",
        navbar: isDark ? "bg-[#1A1D26] border-[#333845]" : "",
        navbarButton: isDark ? "text-white hover:bg-[#252833]" : "",
        navbarButtonIcon: isDark ? "text-gray-400" : "",
        pageScrollBox: isDark ? "bg-[#1A1D26]" : "",
        page: isDark ? "bg-[#1A1D26]" : "",
        rootBox: isDark ? "bg-[#1A1D26]" : "",
        modalContent: isDark ? "bg-[#1A1D26]" : "",
        modalBackdrop: "bg-black/50",
      },
    };
  }, [theme]);

  return (
    <ClerkProvider appearance={appearance}>
      {children}
    </ClerkProvider>
  );
}

