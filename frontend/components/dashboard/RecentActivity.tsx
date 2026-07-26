"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

interface Activity {
  id: number;
  message: string;
  created_at: string;
}

function relativeTime(timestamp: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export default function RecentActivity({ activities: initialActivities }: { activities: Activity[] }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    fetch(`http://127.0.0.1:8000/chat/activity/${userId}?limit=4`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setActivities(data.activities || []))
      .catch(() => {
        // Keep activity supplied by the dashboard if the backend is unavailable.
      });
  }, []);

  if (activities.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/90 shadow-sm p-5">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">{t("Recent Activity")}</h2>
        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500">
          <span className="text-4xl mb-3">🌱</span>
          <p className="font-semibold">{t("No recent activity yet.")}</p>
          <p className="text-sm mt-2">{t("Start chatting with the AI assistant to see your history.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/90 shadow-sm transition-all duration-300 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-[1.15rem] font-semibold text-slate-900">{t("Recent Activity")}</h2>
        <Link href="/queries" className="text-green-700 font-semibold hover:underline text-sm">
          {t("View All")}
        </Link>
      </div>

      <div className="space-y-0">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex items-start gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-green-100 p-2.5 z-10">
                <MessageCircle size={20} className="text-green-600" />
              </div>
              {index !== activities.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
            </div>
            <div className="flex-1 pb-5">
              <p className="font-semibold text-gray-900 text-sm">
                {t("You asked:")} {activity.message}
              </p>
              <p className="text-sm text-gray-500 mt-1">{t(relativeTime(activity.created_at))}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
