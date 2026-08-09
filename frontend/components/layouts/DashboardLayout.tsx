"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { applyAccessibilityPreferences } from "@/lib/accessibilityPreferences";

import FloatingAIAssistant from "@/components/ui/FloatingAIAssistant";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [theme, setTheme] = useState("fresh");

  useEffect(() => {
    const readTheme = () => {
      const current = localStorage.getItem("dashboard_theme") || "fresh";
      setTheme(current);
      document.documentElement.setAttribute("data-theme", current);
      if (current === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    readTheme();
    applyAccessibilityPreferences();

    const handleAccessibilityChange = () => {
      applyAccessibilityPreferences();
    };

    window.addEventListener("themechange", readTheme);
    window.addEventListener("accessibilitychange", handleAccessibilityChange);

    return () => {
      window.removeEventListener("themechange", readTheme);
      window.removeEventListener("accessibilitychange", handleAccessibilityChange);
    };
  }, []);

  const themeStyles = {
    fresh: {
      surface: "bg-[#f5f7fa]",
      overlay: "from-[#f5f7fa]/95 via-[#f5f7fa]/90 to-emerald-100/40",
      accent: "bg-emerald-300/25",
    },
    sky: {
      surface: "bg-[#f0f8ff]",
      overlay: "from-[#f0f8ff]/95 via-[#f0f8ff]/90 to-sky-100/50",
      accent: "bg-sky-300/30",
    },
    earth: {
      surface: "bg-[#faf6f0]",
      overlay: "from-[#faf6f0]/95 via-[#faf6f0]/90 to-amber-100/50",
      accent: "bg-amber-300/30",
    },
    dark: {
      surface: "bg-slate-950 text-slate-100",
      overlay: "from-slate-950/90 via-slate-900/90 to-emerald-950/80",
      accent: "bg-emerald-500/10",
    },
  }[theme] || {
    surface: "bg-[#f5f7fa]",
    overlay: "from-[#f5f7fa]/95 via-[#f5f7fa]/90 to-emerald-100/40",
    accent: "bg-emerald-300/25",
  };

  return (
    <div className={`relative isolate min-h-screen overflow-x-clip ${themeStyles.surface}`}>
      <Image
        src="/images/dashboard-bg.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center opacity-12 dark:opacity-20"
      />
      <div className={`absolute inset-0 -z-10 bg-gradient-to-b ${themeStyles.overlay}`} />
      <div aria-hidden="true" className="absolute -left-32 top-36 -z-10 h-96 w-96 rounded-full bg-sky-200/25 blur-3xl" />
      <div aria-hidden="true" className={`absolute -right-24 bottom-24 -z-10 h-[28rem] w-[28rem] rounded-full ${themeStyles.accent} blur-3xl`} />
      <div aria-hidden="true" className="absolute left-[42%] top-[32rem] -z-10 h-72 w-72 rounded-full bg-amber-100/25 blur-3xl" />

      <div className="relative min-h-screen flex flex-col">
        <TopNavbar />

        <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-2 sm:pt-4 pb-20 lg:pb-10 flex-1">
          {children}
        </main>

        <FloatingAIAssistant />
      </div>
    </div>
  );
}
