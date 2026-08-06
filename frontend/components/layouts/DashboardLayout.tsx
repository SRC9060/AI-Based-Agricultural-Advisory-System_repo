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
      surface: "bg-[#f7fbf8]",
      overlay: "from-white/40 via-[#f7fbf8]/65 to-[#eaf7ed]/80",
      accent: "bg-green-300/20",
    },
    sky: {
      surface: "bg-[#f5faff]",
      overlay: "from-white/45 via-[#f4f9ff]/70 to-[#e7f4ff]/85",
      accent: "bg-sky-300/25",
    },
    earth: {
      surface: "bg-[#fffaf2]",
      overlay: "from-white/45 via-[#fffaf2]/70 to-[#fff0d8]/85",
      accent: "bg-amber-300/25",
    },
    dark: {
      surface: "bg-slate-950 text-slate-100",
      overlay: "from-slate-950/90 via-slate-900/90 to-emerald-950/80",
      accent: "bg-emerald-500/10",
    },
  }[theme] || {
    surface: "bg-[#f7fbf8]",
    overlay: "from-white/40 via-[#f7fbf8]/65 to-[#eaf7ed]/80",
    accent: "bg-green-300/20",
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
        className="-z-20 object-cover object-center opacity-45"
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
