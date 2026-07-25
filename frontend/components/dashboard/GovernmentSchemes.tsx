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

  if (schemes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

        <h2 className="text-2xl font-semibold mb-4 text-slate-900">
          {t("Government Schemes for You")}
        </h2>

        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500">

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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 p-5">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">

        <h2 className="text-[1.15rem] font-semibold text-slate-900">
          {t("Government Schemes for You")}
        </h2>

        <button
          onClick={() => router.push("/schemes")}
          className="text-green-700 font-semibold hover:underline text-sm"
        >
          {t("View All")}
        </button>

      </div>

      <div className="space-y-3">

        {schemes.map((scheme, index) => {

          const iconData = icons[index % icons.length];

          return (
            <div
              key={index}
              className="flex items-center justify-between border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition duration-300 cursor-pointer"
            >

              <div className="flex items-center gap-4">

                <div className={`${iconData.bg} rounded-2xl p-3`}>
                  {iconData.icon}
                </div>

                <div>

                  <h3 className="font-semibold text-gray-900 text-sm">
                    {scheme.title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    {t("Recommended based on your farming profile.")}
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-3">

                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  {t("Eligible")}
                </span>

                <ChevronRight
                  size={20}
                  className="text-gray-400"
                />

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}
