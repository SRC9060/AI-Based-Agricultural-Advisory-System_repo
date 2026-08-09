"use client";

import Link from "next/link";
import { Sprout, ArrowRight, Calendar, Ruler, Layers } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

interface MyFarmSummaryCardProps {
  profile?: {
    crop?: string;
    farm_size?: string;
    farm_size_unit?: string;
    growth_stage?: string;
    farm_name?: string;
  } | null;
  loading?: boolean;
}

export default function MyFarmSummaryCard({ profile, loading }: MyFarmSummaryCardProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm animate-pulse">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="my-5 space-y-3">
          <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  const cropName = profile?.crop ? t(profile.crop) : t("No crop details added yet.");
  const farmSizeStr = profile?.farm_size
    ? `${profile.farm_size} ${profile.farm_size_unit ? t(profile.farm_size_unit) : t("Acres")}`
    : t("Not specified");
  const growthStageStr = profile?.growth_stage ? t(profile.growth_stage) : t("Vegetative Stage");

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2.5 text-emerald-600 dark:text-green-400">
              <Sprout size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2">
                🌱 {t("My Farm")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                {profile?.farm_name || t("Farm & Crop Overview")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3.5 font-body">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Sprout size={16} className="text-emerald-600 dark:text-emerald-400" />
              {t("Crop")}:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {cropName}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Ruler size={16} className="text-blue-600 dark:text-blue-400" />
              {t("Farm Size")}:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {farmSizeStr}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Layers size={16} className="text-amber-600 dark:text-amber-400" />
              {t("Growth Stage")}:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {growthStageStr}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-2">
        <Link
          href="/my-farm"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 font-heading active:scale-98"
        >
          <span>{t("View My Farm")}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
