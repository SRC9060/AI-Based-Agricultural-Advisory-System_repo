import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import { LanguageProvider } from "@/components/LanguageProvider";
import OfflineBanner from "@/components/OfflineBanner";
import SessionGuard from "@/components/SessionGuard";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-based-agricultural-advisory-syst-liard.vercel.app"),
  title: "AgriAdvisor | AI-Powered Agricultural Advisory System for Farmers",
  description:
    "Multilingual AI-powered agricultural advisory platform helping farmers with real-time crop disease detection, localized weather forecasts, market prices, and government schemes.",
  applicationName: "AgriAdvisor",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/agriadvisor-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgriAdvisor",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AgriAdvisor | AI-Powered Agricultural Advisory System for Farmers",
    description:
      "Multilingual AI-powered agricultural advisory platform helping farmers with real-time crop disease detection, localized weather forecasts, market prices, and government schemes.",
    url: "https://ai-based-agricultural-advisory-syst-liard.vercel.app",
    siteName: "AgriAdvisor",
    images: [
      {
        url: "/icons/agriadvisor-512.png",
        width: 512,
        height: 512,
        alt: "AgriAdvisor Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AgriAdvisor | AI-Powered Agricultural Advisory System for Farmers",
    description:
      "Multilingual AI-powered agricultural advisory platform helping farmers with real-time crop disease detection, localized weather forecasts, market prices, and government schemes.",
    images: ["/icons/agriadvisor-512.png"],
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
      <html
        lang="en"
        data-scroll-behavior="smooth"
        className={`${inter.variable} ${poppins.variable} notranslate`}
        translate="no"
        suppressHydrationWarning
      >
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
