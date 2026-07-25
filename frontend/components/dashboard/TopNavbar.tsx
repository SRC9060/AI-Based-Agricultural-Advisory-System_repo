"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";

import {
  Bell,
  ChevronDown,
  Globe,
  LayoutDashboard,
  CloudSun,
  TrendingUp,
  Landmark,
  Bot,
  Sprout,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Weather",
    href: "/weather",
    icon: CloudSun,
  },
  {
    name: "Market",
    href: "/market-prices",
    icon: TrendingUp,
  },
  {
    name: "Schemes",
    href: "/schemes",
    icon: Landmark,
  },
  {
    name: "AI Assistant",
    href: "/chat",
    icon: Bot,
  },
];

const languages = ["English", "हिंदी", "తెలుగు", "ಕన్నడ"];

const langMap = {
  English: "en",
  "हिंदी": "hi",
  "తెలుగు": "te",
  "ಕన్నడ": "kn",
};

const reverseLangMap = {
  en: "English",
  hi: "हिंदी",
  te: "తెలుగు",
  kn: "ಕన్నడ",
};

interface TopNavbarProps {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onMenuClick?: () => void;
}

export default function TopNavbar({
  userName = "Aishwarya",
  userRole = "Farmer",
  userAvatar,
  onMenuClick,
}: TopNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("language");

    router.replace("/login");
  };

  const [langOpen, setLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => {

    if (typeof window === "undefined") return "English";

    const savedLang = localStorage.getItem("language") || "en";

    return (
      reverseLangMap[savedLang as keyof typeof reverseLangMap] || "English"
    );
  });
  const [displayName, setDisplayName] = useState("Farmer");
  const [displayRole] = useState("Farmer");

  useEffect(() => {

    const name = localStorage.getItem("user_name");

    if (name) {
      setDisplayName(name);
    }

  }, []);

  return (
    <header className="sticky top-4 z-50 px-6 pt-4">
      <div className="max-w-[1700px] mx-auto bg-gradient-to-r from-green-50 via-white to-green-50 backdrop-blur-xl border border-green-100 shadow-xl rounded-2xl">

        <div className="flex items-center justify-between h-24 px-10">

          {/* Left */}
          <div className="flex items-center gap-10">

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-green-700 flex items-center justify-center shadow-md">
                <Sprout className="text-white" size={28} />
              </div>

              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  AgriAdvisor
                </h2>

                <p className="text-sm text-slate-600">
                  Smart Farming Platform
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-2">

              {navItems.map((item) => {

                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ease-out
                    ${
                      pathname === item.href
                        ? "bg-green-600 text-white font-semibold shadow-md"
                        : "text-slate-600 hover:bg-green-50 hover:text-green-700 hover:shadow-sm"
                    }
                    `}
                  >
                    <Icon
                      size={20}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className=" text-[15px] transition-all duration-300">
                      {item.name}
                    </span>
                  </Link>
                );

              })}

            </nav>

          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-green-50 transition-all duration-300"
              >
                <Globe size={18} />
                <span className="text-sm font-medium">{selectedLang}</span>
                <ChevronDown size={16} />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg z-50 border border-slate-200 overflow-hidden">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        const code = langMap[lang as keyof typeof langMap];
                        setSelectedLang(lang);
                        localStorage.setItem("language", code);
                        setLangOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-green-100 whitespace-nowrap"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification */}
            <button className="relative w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-green-50 transition-all duration-300">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                3
              </span>
            </button>

            {/* Profile + Logout */}
            <div className="flex items-center gap-3">

              <Link href="/profile">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-green-50 transition-all duration-300 cursor-pointer">

                  {userAvatar ? (
                    <Image
                      src={userAvatar}
                      alt={displayName}
                      width={42}
                      height={42}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center font-bold">
                      {displayName.charAt(0)}
                    </div>
                  )}

                  <div className="hidden xl:block">
                    <p className="font-semibold text-sm">{displayName}</p>
                    <p className="text-xs text-slate-500">{displayRole}</p>
                  </div>

                  <ChevronDown size={16} className="text-slate-500" />

                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
              >
                <LogOut size={18} />
                <span className="hidden xl:inline">Logout</span>
              </button>

            </div>

          </div>

        </div>
      </div>
    </header>
  );
}