"use client";

import { Check, Palette, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";

type ThemeName = "fresh" | "sky" | "earth" | "dark";

const themes: Array<{
  id: ThemeName;
  title: string;
  description: string;
  preview: string;
}> = [
  { id: "fresh", title: "Fresh Green", description: "The calm farming look used by default.", preview: "from-emerald-100 via-white to-green-200" },
  { id: "sky", title: "Sky Blue", description: "A bright, clear and cool workspace.", preview: "from-sky-100 via-white to-blue-200" },
  { id: "earth", title: "Warm Earth", description: "A soft, warm palette for comfortable reading.", preview: "from-amber-100 via-white to-orange-200" },
  { id: "dark", title: "Dark Night", description: "Sleek dark mode for low-light environments.", preview: "from-slate-900 via-slate-800 to-emerald-950" },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("fresh");

  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboard_theme") as ThemeName | null;
    if (savedTheme && themes.some((theme) => theme.id === savedTheme)) setSelectedTheme(savedTheme);
  }, []);

  const chooseTheme = (theme: ThemeName) => {
    setSelectedTheme(theme);
    localStorage.setItem("dashboard_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-6xl py-8">
        <header className="rounded-2xl border border-green-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-7 shadow-sm backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">
              <SettingsIcon size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t("Settings")}</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">{t("Personalise the appearance of your AgriAdvisor workspace.")}</p>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <Palette className="text-green-700 dark:text-green-400" size={23} />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("Themes")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("Choose the colour style you prefer. Your selection is saved on this device.")}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {themes.map((theme) => {
              const selected = selectedTheme === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => chooseTheme(theme.id)}
                  className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition ${selected ? "border-green-600 dark:border-green-500 shadow-md" : "border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm"}`}
                >
                  <div className={`h-24 rounded-xl bg-gradient-to-br ${theme.preview}`} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{t(theme.title)}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{t(theme.description)}</p>
                    </div>
                    {selected && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 dark:bg-green-500 text-white"><Check size={15} /></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-dashed border-green-200 dark:border-slate-800 bg-green-50/85 dark:bg-slate-900/60 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 text-green-700 dark:text-green-400" size={22} />
            <div>
              <h2 className="font-bold text-green-900 dark:text-emerald-400">{t("More settings coming soon")}</h2>
              <p className="mt-1 text-sm leading-6 text-green-800 dark:text-slate-300">{t("Notification preferences, account controls and accessibility options can be added here next week.")}</p>
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
