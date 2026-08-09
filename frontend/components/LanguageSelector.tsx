"use client";

import { useState, useEffect, useRef } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

const languages = ["English", "हिंदी", "తెలుగు", "ಕನ್ನಡ"] as const;
const additionalLanguages = ["தமிழ்", "മലയാളം", "मराठी", "ગુજરાતી"] as const;
const languageOptions = [...languages, ...additionalLanguages];

const languageCodeMap = {
  English: "en",
  "हिंदी": "hi",
  "తెలుగు": "te",
  "ಕನ್ನಡ": "kn",
  "தமிழ்": "ta",
  "മലയാളം": "ml",
  "मराठी": "mr",
  "ગુજરાતી": "gu",
} as const;

const languageNameMap = {
  en: "English",
  hi: "हिंदी",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  ta: "தமிழ்",
  ml: "മലയാളം",
  mr: "मराठी",
  gu: "ગુજરાતી",
} as const;

interface LanguageSelectorProps {
  variant?: "default" | "auth";
  className?: string;
}

export default function LanguageSelector({
  variant = "default",
  className = "",
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = languageNameMap[language] || "English";

  const buttonClasses =
    variant === "auth"
      ? "flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-white/15 bg-slate-900/80 backdrop-blur-xl shadow-lg hover:bg-slate-800/90 transition-all duration-200 text-white font-medium text-sm cursor-pointer"
      : "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-200 transition-all duration-200 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={buttonClasses}
        aria-expanded={isOpen}
        aria-label={t("Select Language")}
        title={t("Select Language")}
      >
        <Globe size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-xs sm:text-sm font-semibold truncate max-w-[60px] xs:max-w-[80px] sm:max-w-[120px]">
          {currentLabel}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-emerald-600 dark:text-emerald-400" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-48 sm:w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[9999] border border-slate-200 dark:border-slate-800 p-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/5 min-w-[180px]">
          <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 mb-1">
            {t("Select Language")}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar">
            {languageOptions.map((lang) => {
              const code =
                languageCodeMap[lang as keyof typeof languageCodeMap];
              const isSelected = language === code;
              return (
                <button
                  key={lang}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setLanguage(code);
                    setIsOpen(false);
                  }}
                  onClick={() => {
                    setLanguage(code);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-xl transition-all duration-150 text-left cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{lang}</span>
                  {isSelected && (
                    <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
