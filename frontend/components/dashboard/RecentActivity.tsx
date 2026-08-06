"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, CloudSun, Landmark, Sprout } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

interface Activity {
  id: number;
  message: string;
  type: string;
  created_at: string;
}

function relativeTime(timestamp: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );
  if (seconds < 60)
    return "Just Now";
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatActivityTitle(type: string) {
  switch (type) {
    case "weather_query":
      return "Checked Weather";
    case "market_price_query":
      return "Viewed Market Prices";
    case "government_scheme_query":
      return "Explored Government Schemes";
    case "crop_management_query":
      return "Asked about Crop Management";
    case "disease_query":
      return "Asked about Crop Disease";
    default:
      return "Asked a General Query";
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "weather_query":
      return {
        icon: <CloudSun size={20} className="text-blue-600" />,
        bg: "bg-blue-100",
      };
    case "market_price_query":
      return {
        icon: <Landmark size={20} className="text-purple-600" />,
        bg: "bg-purple-100",
      };
    case "government_scheme_query":
      return {
        icon: <Landmark size={20} className="text-indigo-600" />,
        bg: "bg-indigo-100",
      };
    case "crop_management_query":
      return {
        icon: <Sprout size={20} className="text-green-600" />,
        bg: "bg-green-100",
      };
    case "disease_query":
      return {
        icon: <Sprout size={20} className="text-red-600" />,
        bg: "bg-red-100",
      };
    default:
      return {
        icon: <MessageCircle size={20} className="text-gray-600" />,
        bg: "bg-gray-100",
      };
  }
}

export default function RecentActivity({
  activities: initialActivities,
}: {
  activities: Activity[];
}) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>(
    Array.isArray(initialActivities) ? initialActivities : [],
  );

  useEffect(() => {
    setActivities(Array.isArray(initialActivities) ? initialActivities : []);
  }, [initialActivities]);

  if (activities.length === 0) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-white/90 dark:border-slate-800 shadow-sm p-5">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
          {t("Recent Activity")}
        </h2>
        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500 dark:text-slate-400">
          <span className="text-4xl mb-3">🌱</span>
          <p className="font-semibold">{t("No recent activity yet.")}</p>
          <p className="text-sm mt-2">
            {t("Start chatting with the AI assistant to see your history.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-white/90 dark:border-slate-800 shadow-sm transition-all duration-300 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-[1.15rem] font-semibold text-slate-900 dark:text-slate-100">
          {t("Recent Activity")}
        </h2>
        <Link
          href="/queries"
          className="text-green-700 dark:text-green-400 font-semibold hover:underline text-sm"
        >
          {t("View All")}
        </Link>
      </div>

      <div className="space-y-0">
        {activities.map((activity, index) => {
          const { icon, bg } = getActivityIcon(activity.type);
          const question = activity.message || "";
          return (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`rounded-full p-2.5 z-10 ${bg} dark:bg-slate-800`}>
                  {icon}
                </div>
              </div>
              <div className="flex-1 pb-4">
                <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                  {t(formatActivityTitle(activity.type))}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {question.length > 50
                  ? `${question.slice(0, 45)}...`
                  : question}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {t(relativeTime(activity.created_at))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
