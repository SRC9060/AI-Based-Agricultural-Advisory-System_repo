"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import TopNavbar from "@/components/dashboard/TopNavbar";

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
    window.addEventListener("themechange", readTheme);
    return () => window.removeEventListener("themechange", readTheme);
  }, []);

  const themeStyles = {
    fresh: {
      surface: "bg-[#f5f7fa]",
      overlay: "from-[#f5f7fa]/95 via-[#f5f7fa]/90 to-emerald-50/20",
      accent: "bg-emerald-200/15",
    },
    sky: {
      surface: "bg-[#f5f7fa]",
      overlay: "from-[#f5f7fa]/95 via-[#f5f7fa]/90 to-sky-50/20",
      accent: "bg-sky-200/15",
    },
    earth: {
      surface: "bg-[#f5f7fa]",
      overlay: "from-[#f5f7fa]/95 via-[#f5f7fa]/90 to-amber-50/20",
      accent: "bg-amber-200/15",
    },
    dark: {
      surface: "bg-slate-950 text-slate-100",
      overlay: "from-slate-950/90 via-slate-900/90 to-emerald-950/80",
      accent: "bg-emerald-500/10",
    },
  }[theme] || {
    surface: "bg-[#f5f7fa]",
    overlay: "from-[#f5f7fa]/95 via-[#f5f7fa]/90 to-emerald-50/20",
    accent: "bg-emerald-200/15",
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

      <div className="relative min-h-screen">

        <TopNavbar />

        <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pb-10">
          {children}
        </main>

      </div>

    </div>
  );
}
