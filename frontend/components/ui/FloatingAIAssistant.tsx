"use client";

import React, { useState } from "react";
import { Bot, X, MessageSquare, Mic, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { t } = useTranslation();

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 font-body">
      {isOpen ? (
        <div className="w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 font-heading font-bold text-sm text-slate-900 dark:text-slate-100">
              <Bot size={18} className="text-emerald-600 dark:text-green-400" />
              <span>{t("AI Assistant")}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Close Assistant"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("Ask anything about your crops, diseases, schemes, weather and farming.")}
          </p>

          <form onSubmit={handleAsk} className="flex items-center gap-1.5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Describe the issue...")}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition shrink-0"
              aria-label="Send query"
            >
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="text-emerald-600 dark:text-green-400 hover:underline font-semibold font-heading cursor-pointer flex items-center gap-1"
            >
              <MessageSquare size={12} />
              <span>{t("Open full chat")}</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-heading text-xs font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer group active:scale-95"
          aria-label="Open AI Assistant"
        >
          <Bot size={18} className="group-hover:rotate-12 transition-transform" />
          <span>🤖 {t("Ask AI")}</span>
        </button>
      )}
    </div>
  );
}
