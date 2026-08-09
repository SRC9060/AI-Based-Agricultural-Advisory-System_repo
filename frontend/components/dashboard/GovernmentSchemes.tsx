"use client";

import {
  ShieldCheck,
  CreditCard,
  FlaskConical,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";

interface Scheme {
  title: string;
}

interface GovernmentSchemesProps {
  schemes: Scheme[];
}

export default function GovernmentSchemes({
  schemes,
}: GovernmentSchemesProps) {

  const router = useRouter();
  const { t } = useTranslation();
  const safeSchemes = Array.isArray(schemes) ? schemes : [];

  const icons = [
    {
      icon: <ShieldCheck className="text-green-600" size={26} />,
      bg: "bg-green-100",
    },
    {
      icon: <CreditCard className="text-blue-600" size={26} />,
      bg: "bg-blue-100",
    },
    {
      icon: <FlaskConical className="text-orange-600" size={26} />,
      bg: "bg-orange-100",
    },
  ];

  if (safeSchemes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">

        <h2 className="text-[1.15rem] font-semibold text-slate-900 dark:text-slate-100 font-heading mb-3">
          {t("Government Schemes for You")}
        </h2>

        <div className="flex flex-col items-center justify-center text-center py-6 text-slate-500 dark:text-slate-400 font-body">

          <span className="text-3xl mb-2">🌱</span>

          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
            {t("No government schemes available yet.")}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("Complete your farming profile to receive personalized schemes.")}
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 p-5">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">

        <h2 className="text-[1.15rem] font-semibold text-slate-900 dark:text-slate-100 font-heading">
          {t("Government Schemes for You")}
        </h2>

        <button
          onClick={() => router.push("/schemes")}
          className="text-emerald-700 dark:text-green-400 font-semibold hover:underline text-sm font-body"
        >
          {t("View All")}
        </button>

      </div>

      <div className="space-y-3">

        {safeSchemes.map((scheme, index) => {

          const iconData = icons[index % icons.length];

          return (
            <div
              key={index}
              className="flex items-center justify-between border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-3.5 sm:p-4 hover:shadow-xs hover:border-emerald-300 dark:hover:border-slate-700 transition duration-300 cursor-pointer"
            >

              <div className="flex items-center gap-3.5 min-w-0">

                <div className={`${iconData.bg} dark:bg-slate-800 rounded-xl p-2.5 shrink-0`}>
                  {iconData.icon}
                </div>

                <div className="min-w-0">

                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm truncate">
                    {t(scheme.title)}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {t("Recommended based on your farming profile.")}
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-3">

                <span className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {t("Eligible")}
                </span>

                <ChevronRight
                  size={18}
                  className="text-gray-400 dark:text-slate-500"
                />

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}
