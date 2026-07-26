"use client";

import { Check, Palette, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";

type ThemeName = "fresh" | "sky" | "earth";

const themes: Array<{
  id: ThemeName;
  title: string;
  description: string;
  preview: string;
}> = [
  { id: "fresh", title: "Fresh Green", description: "The calm farming look used by default.", preview: "from-emerald-100 via-white to-green-200" },
  { id: "sky", title: "Sky Blue", description: "A bright, clear and cool workspace.", preview: "from-sky-100 via-white to-blue-200" },
  { id: "earth", title: "Warm Earth", description: "A soft, warm palette for comfortable reading.", preview: "from-amber-100 via-white to-orange-200" },
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
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-6xl py-8">
        <header className="rounded-2xl border border-green-100 bg-white/90 p-7 shadow-sm backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <SettingsIcon size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t("Settings")}</h1>
              <p className="mt-1 text-slate-600">Personalise the appearance of your AgriAdvisor workspace.</p>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <Palette className="text-green-700" size={23} />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Themes</h2>
              <p className="text-sm text-slate-500">Choose the colour style you prefer. Your selection is saved on this device.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {themes.map((theme) => {
              const selected = selectedTheme === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => chooseTheme(theme.id)}
                  className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition ${selected ? "border-green-600 shadow-md" : "border-slate-200 hover:border-green-300 hover:shadow-sm"}`}
                >
                  <div className={`h-24 rounded-xl bg-gradient-to-br ${theme.preview}`} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{theme.title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500">{theme.description}</p>
                    </div>
                    {selected && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"><Check size={15} /></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-dashed border-green-200 bg-green-50/85 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 text-green-700" size={22} />
            <div>
              <h2 className="font-bold text-green-900">More settings coming soon</h2>
              <p className="mt-1 text-sm leading-6 text-green-800">Notification preferences, account controls and accessibility options can be added here next week.</p>
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
