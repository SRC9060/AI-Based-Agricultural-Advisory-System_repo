"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, CloudSun, Landmark, Sprout } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import EmptyState from "@/components/ui/EmptyState";

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
    case "weather":
      return "Checked Weather";
    case "market_price_query":
    case "market":
      return "Viewed Market Prices";
    case "government_scheme_query":
    case "scheme":
      return "Explored Government Schemes";
    case "crop_management_query":
      return "Asked about Crop Management";
    case "disease_query":
    case "disease":
      return "Asked about Crop Disease";
    default:
      return "Asked a General Query";
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "weather_query":
    case "weather":
      return {
        icon: <CloudSun size={20} className="text-blue-600 dark:text-blue-400" />,
        bg: "bg-blue-100 dark:bg-blue-950/60",
      };
    case "market_price_query":
    case "market":
      return {
        icon: <Landmark size={20} className="text-purple-600 dark:text-purple-400" />,
        bg: "bg-purple-100 dark:bg-purple-950/60",
      };
    case "government_scheme_query":
    case "scheme":
      return {
        icon: <Landmark size={20} className="text-amber-600 dark:text-amber-400" />,
        bg: "bg-amber-100 dark:bg-amber-950/60",
      };
    case "crop_management_query":
    case "disease_query":
    case "disease":
      return {
        icon: <Sprout size={20} className="text-green-600 dark:text-emerald-400" />,
        bg: "bg-green-100 dark:bg-green-950/60",
      };
    default:
      return {
        icon: <MessageCircle size={20} className="text-emerald-600 dark:text-green-400" />,
        bg: "bg-emerald-100 dark:bg-emerald-950/60",
      };
  }
}

interface RecentActivityProps {
  activities?: Activity[];
  initialActivities?: Activity[];
}

export default function RecentActivity({
  activities: activitiesProp,
  initialActivities = [],
}: RecentActivityProps) {
  const { t } = useTranslation();
  const rawList = activitiesProp ?? initialActivities;
  const [activities, setActivities] = useState<Activity[]>(rawList);

  useEffect(() => {
    setActivities(Array.isArray(rawList) ? rawList : []);
  }, [rawList]);

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100 font-heading">
          {t("Recent Activity")}
        </h2>
        <EmptyState
          icon="🌱"
          title={t("No recent activity")}
          description={t("Your farming activities will appear here.")}
          action={
            <Link
              href="/chat"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
            >
              {t("Explore AgriAdvisor")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-[1.15rem] font-semibold text-slate-900 dark:text-slate-100 font-heading">
          {t("Recent Activity")}
        </h2>
        <Link
          href="/queries"
          className="text-emerald-700 dark:text-green-400 font-semibold hover:underline text-sm font-body"
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
                <div className={`rounded-full p-2.5 z-10 ${bg}`}>
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
