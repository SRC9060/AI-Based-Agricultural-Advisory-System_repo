import type { Metadata, Viewport } from "next";
import { ViewTransitions } from "next-view-transitions";
import { LanguageProvider } from "@/components/LanguageProvider";
import OfflineBanner from "@/components/OfflineBanner";
import SessionGuard from "@/components/SessionGuard";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransitions>
      <html lang="en" data-scroll-behavior="smooth" className="notranslate" translate="no" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("dashboard_theme")||"fresh";document.documentElement.setAttribute("data-theme",t);if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})()`,
            }}
          />
        </head>
        <body className="transition-colors duration-200" suppressHydrationWarning>
          <LanguageProvider>
            <OfflineBanner />
            <SessionGuard>{children}</SessionGuard>
          </LanguageProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
