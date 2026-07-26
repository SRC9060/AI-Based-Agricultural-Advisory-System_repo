"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Star } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";

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
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    fetch(`http://127.0.0.1:8000/feedback/${userId}`)
      .then((response) => response.json())
      .then((data) => setFeedback(data.feedback || []));
  };
  useEffect(() => { loadFeedback(); }, []);

  async function submitFeedback() {
    if (message.trim().length < 3) { setStatus("Please write at least 3 characters."); return; }
    const userId = localStorage.getItem("user_id");
    if (!userId) { setStatus("Please log in before submitting feedback."); return; }
    setSubmitting(true); setStatus("");
    try {
      const response = await fetch("http://127.0.0.1:8000/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: Number(userId), message, category, rating }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to save feedback");
      setMessage(""); setCategory("Suggestion"); setRating(5); setStatus("Thanks! Your feedback was saved successfully."); loadFeedback();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save feedback"); } finally { setSubmitting(false); }
  }

  return <DashboardLayout><div className="mx-auto mt-14 max-w-4xl space-y-8 pb-10">
    <section className="overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-100 via-emerald-50 to-white p-8 text-green-950 shadow-sm"><div className="flex items-center gap-4"><div className="rounded-2xl bg-green-200 p-3 text-green-700"><MessageSquare size={28}/></div><div><h1 className="text-3xl font-bold">Help us grow better</h1><p className="mt-1 text-green-800">Your feedback helps AgriAdvisor support farmers more effectively.</p></div></div></section>
    <section className="rounded-3xl border border-green-100 bg-green-50/40 p-7 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{t("Share your experience")}</h2><div className="mt-8 grid gap-8 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">{t("Feedback type")}<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 font-normal outline-none focus:border-green-600">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="rounded-2xl border border-green-100 bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">How would you rate AgriAdvisor?</p><span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">{rating}/5</span></div><div className="mt-4 flex gap-3">{[1, 2, 3, 4, 5].map((value) => <button key={value} onClick={() => setRating(value)} aria-label={`${value} stars`} className="rounded-lg p-1 transition hover:scale-110"><Star size={30} className={value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}/></button>)}</div></div></div><label className="mt-8 block text-sm font-semibold text-slate-700">{t("Your feedback")}<textarea value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} className="mt-2 h-40 w-full resize-none rounded-xl border border-green-200 bg-white p-4 font-normal outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100" placeholder="Tell us what worked well or what we can improve..."/></label><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>Your feedback is saved securely to your account.</span><span>{message.length}/2000</span></div><button disabled={submitting} onClick={submitFeedback} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"><Send size={18}/>{submitting ? "Saving..." : t("Submit feedback")}</button>{status && <p className="mt-4 font-medium text-green-700">{status}</p>}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{t("Your feedback history")}</h2>{feedback.length === 0 ? <p className="mt-3 text-sm text-slate-500">No feedback submitted yet. Your first suggestion can make a difference.</p> : <div className="mt-5 space-y-3">{feedback.map((item) => <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">{item.category}</span><span className="text-amber-500">{"★".repeat(item.rating)}<span className="text-slate-300">{"★".repeat(5 - item.rating)}</span></span></div><p className="mt-3 text-sm text-slate-700">{item.message}</p><p className="mt-3 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></article>)}</div>}</section>
  </div></DashboardLayout>;
}
