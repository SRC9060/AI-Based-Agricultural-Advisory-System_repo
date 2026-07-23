"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

const menuItems = [
  { name: "Dashboard", icon: "🏠", href: "/dashboard" },
  { name: "Ask Assistant", icon: "💬", href: "/chat" },
  { name: "Voice Assistant", icon: "🎤", href: "/voice" },
  { name: "Soil & Crop Info", icon: "🌱", href: "/soil-crop" },
  { name: "Government Schemes", icon: "🏛️", href: "/schemes" },
  { name: "Weather", icon: "🌦️", href: "/weather" },
  { name: "Market Prices", icon: "📈", href: "/market-prices" },
  { name: "My Queries", icon: "📋", href: "/queries" },
];

const utilityItems = [
  { name: "Profile", icon: "👤", href: "/profile" },
];

const languages = [
  "English",
  "हिंदी",
  "తెలుగు",
];


const translations = {
  English: {
    dashboard: "Dashboard",
    assistant: "Ask Assistant",
    voice: "Voice Assistant",
    soil: "Soil & Crop Info",
    schemes: "Government Schemes",
    weather: "Weather",
    market: "Market Prices",
    queries: "My Queries",
    profile: "Profile",
    language: "Language",
  },

  "తెలుగు": {
    dashboard: "డాష్‌బోర్డ్",
    assistant: "సహాయకుడిని అడగండి",
    voice: "వాయిస్ సహాయకుడు",
    soil: "నేల & పంట సమాచారం",
    schemes: "ప్రభుత్వ పథకాలు",
    weather: "వాతావరణం",
    market: "మార్కెట్ ధరలు",
    queries: "నా ప్రశ్నలు",
    profile: "ప్రొఫైల్",
    language: "భాష",
  },

  "हिंदी": {
    dashboard: "डैशबोर्ड",
    assistant: "सहायक से पूछें",
    voice: "वॉयस सहायक",
    soil: "मिट्टी और फसल जानकारी",
    schemes: "सरकारी योजनाएँ",
    weather: "मौसम",
    market: "बाजार भाव",
    queries: "मेरे प्रश्न",
    profile: "प्रोफ़ाइल",
    language: "भाषा",
  }
};



export default function Sidebar() {
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const t = translations[selectedLang as keyof typeof translations];

  return (
    <aside className="w-64 min-h-screen bg-[#166534] text-white flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
      <div>
        <div className="px-6 py-6 border-b border-green-800/80">
          <h1 className="text-[1.35rem] font-semibold flex items-center gap-2 tracking-tight">
            🌱 AgriAdvisor
          </h1>

          <p className="text-sm text-green-200 mt-1.5">
            AI-Powered Farming Assistant
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
              <span className="text-sm">
                {item.name === "Dashboard" && t.dashboard}
                {item.name === "Ask Assistant" && t.assistant}
                {item.name === "Voice Assistant" && t.voice}
                {item.name === "Soil & Crop Info" && t.soil}
                {item.name === "Government Schemes" && t.schemes}
                {item.name === "Weather" && t.weather}
                {item.name === "Market Prices" && t.market}
                {item.name === "My Queries" && t.queries}
              </span>
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
              <span className="text-sm">{t.profile}</span>
            </Link>
          ))}

          <div className="relative mt-1">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2 text-white hover:bg-green-50 hover:text-[#166534] transition-all duration-200"
            >
              <span className="flex items-center gap-3">
                <span className="text-lg leading-none">🌐</span>
                <span className="text-sm">{selectedLang}</span>
              </span>
              <ChevronDown size={16} />
            </button>

            {langOpen && (
              <div className="bg-white text-[#166534] rounded-xl mx-2 mb-2 overflow-hidden shadow-lg">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLang(lang);
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-green-100 ${
                      selectedLang === lang ? "font-semibold bg-green-50" : ""
                    }`}
                  >
                    {lang}
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
          <span className="text-sm">Logout</span>
        </Link>

        <div className="bg-[#14532d] rounded-2xl p-4 text-center shadow-sm">
          <p className="text-3xl mb-2">🧑‍🌾</p>
          <p className="font-semibold text-sm">Need Help?</p>
          <p className="text-xs text-green-200 mt-1.5">
            Click the assistant button to get started
          </p>
        </div>
      </div>
    </aside>
  );
}