"use client";

import { MessageCircle, CloudSun, Landmark, Sprout } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import { useEffect, useState, useCallback } from "react";

interface Activity {
  title: string;
  type: string;
  created_at: string;
}

function getTimeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);

  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";

  const minutes = Math.floor(diff / 60);
  if (minutes < 60)
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7)
    return `${days} day${days > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

function formatActivityTitle(type: string, question: string) {
  switch (type) {
    case "weather_query":
      return "🌦 Checked Weather";

    case "market_price_query":
      return "💰 Viewed Market Prices";

    case "government_scheme_query":
      return "📜 Explored Government Schemes";

    case "crop_management_query":
      return "🌾 Asked about Crop Management";

    case "disease_query":
      return "🦠 Asked about Crop Disease";

    default:
      return question.length > 45
        ? `💬 ${question.substring(0, 45)}...`
        : `💬 ${question}`;
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

export default function RecentActivity() {
  const { t } = useTranslation();

  const [activities, setActivities] = useState<Activity[]>([]);

  const fetchActivities = useCallback(async () => {
    const userId = localStorage.getItem("user_id");

    if (!userId) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/recent-activity/${userId}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setActivities(data.activities || []);

    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchActivities();

    const interval = setInterval(fetchActivities, 30000);

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchActivities();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [fetchActivities]);

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">
          Recent Activity
        </h2>

        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500">
          <span className="text-4xl mb-3">🌱</span>

          <p className="font-semibold">
            No recent activity yet.
          </p>

          <p className="text-sm mt-2">
            Start chatting with the AI assistant to see your history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

      <div className="flex justify-between items-center mb-5">

        <h2 className="text-lg font-semibold">
          {t("Recent Activity")}
        </h2>

        <button className="text-green-700 text-sm hover:underline">
          {t("View All")}
        </button>

      </div>

      <div className="space-y-4">

        {activities.map((activity) => {

          const style = getActivityIcon(activity.type);

          return (
            <div
              key={activity.title + activity.created_at}
              className="flex items-center gap-4"
            >

              <div className={`${style.bg} p-2 rounded-full`}>
                {style.icon}
              </div>

              <div>

                <p className="font-medium text-sm">
                  {formatActivityTitle(activity.type, activity.title)}
                </p>

                <p className="text-xs text-gray-500">
                  {getTimeAgo(activity.created_at)}
                </p>

              </div>

            </div>
          );

        })}

      </div>

    </div>
  );
}