"use client";

import { Link } from "next-view-transitions";
import { CloudSun, Landmark, TrendingUp, Stethoscope, MessageSquare } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

export default function QuickAccess() {
  const { t } = useTranslation();
  const items = [
    { name: "Crop Doctor", icon: <Stethoscope size={22} className="text-blue-600" />, iconBg: "bg-blue-100", link: "/chat" },
    { name: "Market Prices", icon: <TrendingUp size={22} className="text-orange-500" />, iconBg: "bg-orange-100", link: "/market-prices" },
    { name: "Weather Update", icon: <CloudSun size={22} className="text-sky-500" />, iconBg: "bg-sky-100", link: "/weather" },
    { name: "Schemes", icon: <Landmark size={18} className="text-purple-600" />, iconBg: "bg-purple-100", link: "/schemes" },
    { name: "Feedback", icon: <MessageSquare size={18} className="text-emerald-600" />, iconBg: "bg-emerald-100", link: "/feedback" },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-300">
      <h2 className="mb-4 text-[1.05rem] font-semibold text-slate-900 dark:text-slate-100 font-heading">
        ⚡ {t("Quick Access")}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.link}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 p-3.5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-green-600 hover:bg-emerald-50/50 dark:hover:bg-slate-700 hover:shadow-xs"
          >
            <div className={`${item.iconBg} dark:bg-slate-700 flex h-12 w-12 items-center justify-center rounded-xl shadow-2xs`}>
              {item.icon}
            </div>
            <p className="mt-2 text-center text-sm font-medium text-slate-900 dark:text-slate-100 font-body">
              {t(item.name)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
