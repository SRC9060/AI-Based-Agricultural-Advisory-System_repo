"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Star } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { getCurrentUserId } from "@/lib/session";

type Feedback = { id: number; message: string; category: string; rating: number; created_at: string };
const categories = ["Suggestion", "Bug report", "Appreciation", "Other"];

export default function FeedbackPage() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Suggestion");
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loadFeedback = () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    apiFetch(`${API_URL}/feedback/${userId}`)
      .then((response) => response.json())
      .then((data) => setFeedback(data.feedback || []));
  };
  useEffect(() => { loadFeedback(); }, []);

  async function submitFeedback() {
    if (message.trim().length < 3) { setStatus("Please write at least 3 characters."); return; }
    const userId = getCurrentUserId();
    if (!userId) { setStatus("Please log in before submitting feedback."); return; }
    setSubmitting(true); setStatus("");
    try {
      const response = await apiFetch(`${API_URL}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: Number(userId), message, category, rating }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to save feedback");
      setMessage(""); setCategory("Suggestion"); setRating(5); setStatus("Thanks! Your feedback was saved successfully."); loadFeedback();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save feedback"); } finally { setSubmitting(false); }
  }

  return <DashboardLayout><div className="mx-auto mt-14 max-w-4xl space-y-8 pb-10">
    <section className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-slate-900 dark:text-slate-100 shadow-sm"><div className="flex items-center gap-4"><div className="rounded-2xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100/80 dark:border-transparent p-3 text-emerald-600 dark:text-green-400"><MessageSquare size={28}/></div><div><h1 className="text-3xl font-bold font-heading text-slate-900 dark:text-slate-100">{t("Help us grow better")}</h1><p className="mt-1 text-slate-600 dark:text-slate-300 font-body">{t("Share a quick suggestion or report an issue.")}</p></div></div></section>
    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm"><h2 className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100">{t("Share your experience")}</h2><div className="mt-8 grid gap-8 md:grid-cols-2 font-body"><label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("Feedback type")}<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 font-normal text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20">{categories.map((item) => <option key={item} value={item} className="dark:bg-slate-900 dark:text-slate-100">{t(item)}</option>)}</select></label><div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("Rate AgriAdvisor")}</p><span className="rounded-full bg-emerald-100 dark:bg-green-950/60 px-3 py-1 text-sm font-bold text-emerald-700 dark:text-green-400">{rating}/5</span></div><div className="mt-4 flex gap-3">{[1, 2, 3, 4, 5].map((value) => <button key={value} onClick={() => setRating(value)} aria-label={`${value} stars`} className="rounded-lg p-1 transition hover:scale-110"><Star size={30} className={value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}/></button>)}</div></div></div><label className="mt-8 block text-sm font-semibold text-slate-700 dark:text-slate-300 font-body">{t("Your feedback")}<textarea value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} className="mt-2 h-40 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 font-normal text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20" placeholder={t("Tell us what worked well or what we can improve...")}/></label><div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-body"><span>{t("Saved to your account.")}</span><span>{message.length}/2000</span></div><button disabled={submitting} onClick={submitFeedback} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-6 py-3 font-semibold text-white font-heading shadow-sm transition hover:from-emerald-700 hover:to-green-700 disabled:opacity-60"><Send size={18}/>{submitting ? t("Saving...") : t("Submit feedback")}</button>{status && <p className="mt-4 font-medium text-emerald-700 dark:text-green-400 font-body">{t(status)}</p>}</section>
    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm"><h2 className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100">{t("Recent feedback")}</h2>{feedback.length === 0 ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-body">{t("No feedback submitted yet.")}</p> : <div className="mt-5 space-y-3">{feedback.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-4 font-body"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-100 dark:bg-green-950/60 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-green-400">{t(item.category)}</span><span className="text-amber-500">{"★".repeat(item.rating)}<span className="text-slate-300 dark:text-slate-600">{"★".repeat(5 - item.rating)}</span></span></div><p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{item.message}</p><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{new Date(item.created_at).toLocaleString()}</p></article>)}</div>}</section>
  </div></DashboardLayout>;
}
