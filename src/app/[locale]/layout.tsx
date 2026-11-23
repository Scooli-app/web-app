import AuthProvider from "@/components/providers/AuthProvider";
import ClerkThemeProvider from "@/components/providers/ClerkThemeProvider";
import StoreProvider from "@/components/providers/StoreProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { ClerkLocaleStamp } from "@/components/providers/ClerkLocaleStamp";
import { TrialPromoCapture } from "@/components/billing/TrialPromoCapture";
import LocaleProvider from "@/components/providers/LocaleProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isSupportedLocale, locales } from "@/i18n/locales";
import { TranslatorBridge } from "@/i18n/TranslatorBridge";
import { Lato, Lexend, Merriweather, Montserrat, Nunito, Playfair_Display, Poppins, Raleway } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('scooli-theme');
    var isDark = theme === 'dark' || 
      ((theme === 'system' || !theme) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

const lexend = Lexend({
  variable: "--font-lexend-variable",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Fonts available for slide text in the presentation editor.
// next/font ensures they're subset and served from the same origin.
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const raleway = Raleway({ variable: "--font-raleway", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["300", "400", "700"] });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], weight: ["300", "400", "700"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

type LocaleParams = { params: Promise<{ locale: string }> };

/** One prerendered copy of every page per language; middleware picks which. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "appMeta" });
  return {
    title: t("title"),
    description: t("description"),
    icons: {
      icon: [
        { url: "/favicon.ico", type: "image/x-icon" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
    appleWebApp: {
      title: "Scooli",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  // Middleware rewrites every page to /{locale}/… from the NEXT_LOCALE cookie
  // (pt-PT when missing), so the language comes from the segment, not a cookie
  // read here, and the page stays static.
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${lexend.variable} ${poppins.variable} ${montserrat.variable} ${raleway.variable} ${lato.variable} ${merriweather.variable} ${nunito.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_BASE_API_URL}
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href={process.env.NEXT_PUBLIC_BASE_API_URL}
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${lexend.className} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider>
          <TranslatorBridge />
          <StoreProvider>
            <ThemeProvider>
              <ClerkThemeProvider>
                <AuthProvider>
                  <LocaleProvider>
                    <ClerkLocaleStamp />
                    <TrialPromoCapture />
                    {children}
                    <Toaster position="bottom-right" />
                  </LocaleProvider>
                </AuthProvider>
              </ClerkThemeProvider>
            </ThemeProvider>
          </StoreProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
