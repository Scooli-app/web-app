"use client";

import type { Locale } from "@/i18n/locales";
import type { RootState } from "@/store/store";
import { enUS, ptPT } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import { useSelector } from "react-redux";

/**
 * Clerk's own `pt-PT` pack mixes in Brazilian Portuguese ("Registre-se",
 * "Entrando...") and leaves several strings entirely untranslated in
 * English — verified against @clerk/localizations directly, not assumed.
 * These are the ones that sit on screens Scooli actually shows (sign-in,
 * sign-up, the account modal opened via `useClerk().openUserProfile()`);
 * organization-management strings are left alone since Scooli doesn't
 * render Clerk's built-in org UI. Patched here rather than upstream since
 * there's no fork of the package to carry a source-level fix.
 */
// Non-null: these sections are always populated on the real ptPT bundle —
// only Clerk's type marks them optional, for locales that might omit them.
const baseSignIn = ptPT.signIn!;
const baseSignUp = ptPT.signUp!;
const baseUserProfile = ptPT.userProfile!;

const PT_PT_CORRECTIONS: Partial<typeof ptPT> = {
  signIn: {
    ...baseSignIn,
    start: {
      ...baseSignIn.start,
      actionLink: "Registar-se",
    },
    emailLink: {
      ...baseSignIn.emailLink,
      loading: {
        ...baseSignIn.emailLink?.loading,
        title: "A entrar...",
      },
    },
    passwordPwned: {
      ...baseSignIn.passwordPwned,
      title:
        "Esta palavra-passe foi comprometida numa violação de dados. Escolha outra por motivos de segurança.",
    },
    resetPassword: {
      ...baseSignIn.resetPassword,
      requiredMessage: "Por motivos de segurança, é necessário repor a palavra-passe.",
    },
  },
  signUp: {
    ...baseSignUp,
    emailLink: {
      ...baseSignUp.emailLink,
      title: "Verifique o seu e-mail",
      loading: {
        ...baseSignUp.emailLink?.loading,
        title: "A entrar...",
      },
    },
  },
  userProfile: {
    ...baseUserProfile,
    navbar: {
      ...baseUserProfile.navbar,
      account: "Perfil",
      description: "Faça a gestão dos dados da sua conta.",
      security: "Segurança",
      title: "Conta",
    },
    passwordPage: {
      ...baseUserProfile.passwordPage,
      checkboxInfoText__signOutOfOtherSessions:
        "Recomendamos terminar sessão em todos os outros dispositivos que possam ter usado a palavra-passe anterior.",
    },
    phoneNumberPage: {
      ...baseUserProfile.phoneNumberPage,
      verifySubtitle: "Insira o código de verificação enviado para {{identifier}}",
      verifyTitle: "Verificar número de telemóvel",
    },
  },
};

/**
 * Clerk ships its own translations; we only have to hand it the right bundle.
 * Keyed by our locale registry so a new language fails to compile here rather
 * than silently rendering Clerk's screens in Portuguese.
 */
const CLERK_LOCALIZATIONS: Record<Locale, typeof ptPT> = {
  "pt-PT": { ...ptPT, ...PT_PT_CORRECTIONS },
  en: enUS,
};

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
  const locale = useLocale() as Locale;
  const localization = CLERK_LOCALIZATIONS[locale] ?? ptPT;

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
    <ClerkProvider
      appearance={appearance}
      localization={localization}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}

