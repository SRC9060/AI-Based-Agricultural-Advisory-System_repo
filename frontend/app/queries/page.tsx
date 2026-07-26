"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";

type Activity = { id: number; message: string; created_at: string };

export default function QueriesPage() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    fetch(`http://127.0.0.1:8000/chat/activity/${userId}?limit=100`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setActivities(data.activities || []))
      .finally(() => setLoading(false));
  }, []);

  return <DashboardLayout><main className="mx-auto max-w-5xl py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-green-800">{t("My Queries")}</h1><p className="mt-2 text-slate-600">Your questions saved from AI Assistant conversations.</p></div><Link href="/chat" className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800">{t("Ask a question")}</Link></div>
    <section className="mt-6 rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur">
      {loading ? <p className="py-10 text-center text-slate-500">{t("Loading...")}</p> : activities.length === 0 ? <div className="py-12 text-center text-slate-500"><MessageCircle className="mx-auto mb-3 text-green-600" size={34}/><p className="font-semibold">{t("No queries yet.")}</p><p className="mt-1 text-sm">Ask the AI Assistant your first farming question.</p></div> : <div className="space-y-3">{activities.map((activity) => <Link key={activity.id} href={`/chat?q=${encodeURIComponent(activity.message)}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-green-300 hover:bg-green-50"><div className="flex min-w-0 items-center gap-3"><span className="rounded-full bg-green-100 p-2 text-green-700"><MessageCircle size={18}/></span><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{activity.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(activity.created_at).toLocaleString()}</p></div></div><ArrowUpRight className="shrink-0 text-green-700" size={18}/></Link>)}</div>}
    </section>
  </main></DashboardLayout>;
}
