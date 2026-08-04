"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, CloudSun, Landmark, Sprout, ArrowUpRight } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { getCurrentUserId } from "@/lib/session";

interface Activity {
  id: number;
  message: string;
  type: string;
  created_at: string;
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

export default function QueriesPage() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    apiFetch(`${API_URL}/recent-activity/${userId}?limit=100`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setActivities(data.activities || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-5xl py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-green-800">
              {t("My Queries")}
            </h1>
            <p className="mt-2 text-slate-600">
              Your questions saved from AI Assistant conversations.
            </p>
          </div>
          <Link
            href="/chat"
            className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
          >
            {t("Ask a question")}
          </Link>
        </div>
        <section className="mt-6 rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur">
          {loading ? (
            <p className="py-10 text-center text-slate-500">
              {t("Loading...")}
            </p>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <MessageCircle
                className="mx-auto mb-3 text-green-600"
                size={34}
              />
              <p className="font-semibold">{t("No queries yet.")}</p>
              <p className="mt-1 text-sm">
                {t("Start chatting with the AI assistant to see your history.")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const { icon, bg } = getActivityIcon(activity.type);
                const question = activity.message;
                return (
                  <Link
                    key={activity.id}
                    href={`/chat?q=${encodeURIComponent(question)}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-green-300 hover:bg-green-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`rounded-full p-2.5 z-10 ${bg}`}>
                          {icon}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 text-sm">
                          {formatActivityTitle(activity.type)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {question}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(activity.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                          {", "}
                          {new Date(activity.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="shrink-0 text-green-700" size={18} />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}
