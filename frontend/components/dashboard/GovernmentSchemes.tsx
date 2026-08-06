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
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-white/90 dark:border-slate-800 shadow-sm p-5">

        <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
          {t("Government Schemes for You")}
        </h2>

        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500 dark:text-slate-400">

          <span className="text-4xl mb-3">🌱</span>

          <p className="font-semibold">
            {t("No government schemes available right now.")}
          </p>

          <p className="text-sm mt-2">
            {t("Complete your profile or check back later.")}
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-white/90 dark:border-slate-800 shadow-sm transition-all duration-300 p-5">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">

        <h2 className="text-[1.15rem] font-semibold text-slate-900 dark:text-slate-100">
          {t("Government Schemes for You")}
        </h2>

        <button
          onClick={() => router.push("/schemes")}
          className="text-green-700 dark:text-green-400 font-semibold hover:underline text-sm"
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
              className="flex items-center justify-between border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60 rounded-2xl p-4 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition duration-300 cursor-pointer"
            >

              <div className="flex items-center gap-4">

                <div className={`${iconData.bg} dark:bg-slate-800 rounded-2xl p-3`}>
                  {iconData.icon}
                </div>

                <div>

                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                    {t(scheme.title)}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {t("Recommended based on your farming profile.")}
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-3">

                <span className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                  {t("Eligible")}
                </span>

                <ChevronRight
                  size={20}
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
