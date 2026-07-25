"use client";

import {
  CloudSun,
  Sprout,
  MessageCircle,
  Landmark,
} from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

export default function RecentActivity() {
  const { t } = useTranslation();
  const activities = [
    {
      title: "You asked about Paddy cultivation",
      time: "2 hours ago",
      icon: <MessageCircle size={20} className="text-green-600" />,
      iconBg: "bg-green-100",
    },
    {
      title: "Weather update checked",
      time: "5 hours ago",
      icon: <CloudSun size={20} className="text-blue-600" />,
      iconBg: "bg-blue-100",
    },
    {
      title: "Soil health report viewed",
      time: "1 day ago",
      icon: <Sprout size={20} className="text-orange-600" />,
      iconBg: "bg-orange-100",
    },
    {
      title: "Checked PMFBY scheme",
      time: "2 days ago",
      icon: <Landmark size={20} className="text-purple-600" />,
      iconBg: "bg-purple-100",
    },
  ];

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">Recent Activity</h2>
        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500">
          <span className="text-4xl mb-3">🌱</span>
          <p className="font-semibold">No recent activity yet.</p>
          <p className="text-sm mt-2">Start chatting with the AI assistant to see your history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-[1.15rem] font-semibold text-slate-900">
          {t("Recent Activity")}
        </h2>

        <button className="text-green-700 font-semibold hover:underline text-sm">
          {t("View All")}
        </button>
      </div>

      <div className="space-y-0">

        {activities.map((activity, index) => (

          <div key={activity.title} className="flex items-start gap-4 relative">

            <div className="flex flex-col items-center">
              <div className={`${activity.iconBg} rounded-full p-2.5 z-10`}>
                {activity.icon}
              </div>

              {index !== activities.length - 1 && (
                <div className="w-px flex-1 bg-slate-200 my-1" />
              )}
            </div>

            <div className="flex-1 pb-5">
              <p className="font-semibold text-gray-900 text-sm">
                {t(activity.title)}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                {t(activity.time)}
              </p>
            </div>

          </div>

        ))}

      </div>

    </div>
  );
}
