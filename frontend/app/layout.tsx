import type { Metadata, Viewport } from "next";
import { ViewTransitions } from "next-view-transitions";
import { I18nProvider } from "next-i18next/client";
import { getResources, getT, initServerI18next } from "next-i18next/server";
import { LanguageProvider } from "@/components/LanguageProvider";
import OfflineBanner from "@/components/OfflineBanner";
import i18nConfig from "../i18n.config";
import "./globals.css";

initServerI18next(i18nConfig);

export const metadata: Metadata = {
  title: "AgriAdvisor",
  description: "AI-Based Agricultural Advisory System",
  applicationName: "AgriAdvisor",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgriAdvisor",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f7a35",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { i18n, lng } = await getT();
  const resources = getResources(i18n);
  return (
    <ViewTransitions>
      <html lang={lng} data-scroll-behavior="smooth">
        <body>
          <I18nProvider language={lng} resources={resources}>
            <LanguageProvider>
              <OfflineBanner />
              {children}
            </LanguageProvider>
          </I18nProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
