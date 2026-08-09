"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

const menuItems = [
  { name: "Dashboard", icon: "🏠", href: "/dashboard" },
  { name: "My Farm", icon: "🌱", href: "/my-farm" },
  { name: "Disease Detection", icon: "📷", href: "/disease-detection" },
  { name: "Ask Assistant", icon: "💬", href: "/chat" },
  { name: "Voice Assistant", icon: "🎤", href: "/voice" },
  { name: "Soil & Crop Info", icon: "🌾", href: "/soil-crop" },
  { name: "Government Schemes", icon: "🏛️", href: "/schemes" },
  { name: "Weather", icon: "🌦️", href: "/weather" },
  { name: "Market Prices", icon: "📈", href: "/market-prices" },
  { name: "My Queries", icon: "📋", href: "/queries" },
];

const utilityItems = [
  { name: "Profile", icon: "👤", href: "/profile" },
];

const languages = [
  { label: "English", code: "en" },
  { label: "हिंदी", code: "hi" },
  { label: "ಕನ್ನಡ", code: "kn" },
  { label: "తెలుగు", code: "te" },
  { label: "தமிழ்", code: "ta" },
  { label: "മലയാളം", code: "ml" },
  { label: "मराठी", code: "mr" },
  { label: "ગુજરાતી", code: "gu" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);

  const currentLangLabel =
    languages.find((l) => l.code === language)?.label || "English";

  return (
    <aside className="w-64 min-h-screen bg-[#166534] text-white flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.12)] font-body">
      <div>
        <div className="px-6 py-6 border-b border-green-800/80">
          <h1 className="text-[1.35rem] font-semibold flex items-center gap-2 tracking-tight font-heading">
            🌱 AgriAdvisor
          </h1>

          <p className="text-sm text-green-200 mt-1.5 font-body">
            {t("AI-Powered Farming Assistant")}
          </p>
        </div>

        <nav className="mt-5 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all duration-200 ${
                pathname === item.href
                  ? "bg-green-100 text-[#166534] font-semibold shadow-sm"
                  : "text-white hover:bg-green-50 hover:text-[#166534]"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-sm font-medium">{t(item.name)}</span>
            </Link>
          ))}

          <div className="border-t border-green-800/70 my-3" />

          {utilityItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all duration-200 ${
                pathname === item.href
                  ? "bg-green-100 text-[#166534] font-semibold shadow-sm"
                  : "text-white hover:bg-green-50 hover:text-[#166534]"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-sm font-medium">{t(item.name)}</span>
            </Link>
          ))}

          <div className="relative mt-1">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2 text-white hover:bg-green-50 hover:text-[#166534] transition-all duration-200"
            >
              <span className="flex items-center gap-3">
                <span className="text-lg leading-none">🌐</span>
                <span className="text-sm font-medium">{currentLangLabel}</span>
              </span>

              <ChevronDown size={16} />
            </button>

            {langOpen && (
              <div className="bg-white dark:bg-slate-900 text-[#166534] dark:text-slate-100 rounded-xl mx-2 mb-2 overflow-hidden shadow-lg border border-transparent dark:border-slate-800">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-green-100 dark:hover:bg-slate-800 ${
                      language === lang.code
                        ? "font-semibold bg-green-50 dark:bg-slate-800/80 text-green-800 dark:text-green-400"
                        : ""
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="px-5 py-5 border-t border-green-800/70">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-white hover:bg-green-50 hover:text-[#166534] transition-all duration-200"
        >
          <span className="text-lg leading-none">🚪</span>
          <span className="text-sm font-medium">{t("Logout")}</span>
        </Link>

        <div className="bg-[#14532d] rounded-2xl p-4 text-center shadow-sm">
          <p className="text-3xl mb-2">🧑‍🌾</p>

          <p className="font-semibold text-sm font-heading">{t("Need Help?")}</p>

          <p className="text-xs text-green-200 mt-1.5">
            {t("Click the assistant button to get started")}
          </p>
        </div>
      </div>
    </aside>
  );
}
