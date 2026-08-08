"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Star } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";
import { getCurrentUserId } from "@/lib/session";

const categories = ["Suggestion", "Bug report", "Appreciation", "Other"];
type FeedbackItem = { id: number; message: string; category: string; rating: number; created_at: string };

export default function FarmBanner() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Suggestion");
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FeedbackItem[]>([]);

  const loadHistory = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      const response = await apiFetch(`${API_URL}/feedback/${userId}`);
      if (!response.ok) return;
      const data = await response.json();
      setHistory((data.feedback || []).slice(0, 2));
    } catch {
      // The feedback form remains usable if the history request is unavailable.
    }
  };

  useEffect(() => { void loadHistory(); }, []);

  async function submitFeedback() {
    if (message.trim().length < 3) {
      setStatus(t("Please write at least 3 characters."));
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      setStatus(t("Please log in first."));
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const response = await apiFetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId), message, category, rating }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to save feedback");
      setMessage("");
      setStatus(t("Thank you! Feedback saved."));
      await loadHistory();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save feedback");
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100/80 dark:border-transparent p-2 text-emerald-600 dark:text-green-400"><MessageSquare size={20} /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">{t("Help us grow better")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-body">{t("Share a quick suggestion or report an issue.")}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 font-body">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{t("Feedback type")}
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-normal outline-none text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
            {categories.map((item) => <option key={item} value={item} className="dark:bg-slate-900 dark:text-slate-100">{t(item)}</option>)}
          </select>
        </label>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span>{t("Rate AgriAdvisor")}</span><span className="text-emerald-600 dark:text-green-400">{rating}/5</span>
          </div>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} stars`}>
                <Star size={20} className={value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300 font-body">{t("Your feedback")}
        <textarea value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder={t("Tell us what worked well or what we can improve...")} className="mt-1.5 h-24 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm font-normal text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
      </label>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-body"><span>{t("Saved to your account.")}</span><span>{message.length}/500</span></div>
      <button disabled={saving} onClick={submitFeedback} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 disabled:opacity-60 font-heading"><Send size={16} />{saving ? t("Saving...") : t("Submit feedback")}</button>
      {status && <p className="mt-2 text-xs font-medium text-green-700 dark:text-green-400">{status}</p>}

      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("Recent feedback")}</h3>
          <button type="button" onClick={() => { window.location.href = "/feedback"; }} className="text-xs font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
            {t("View all")}
          </button>
        </div>
        {history.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("No feedback submitted yet.")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {history.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-green-100 dark:bg-green-950/60 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400">{t(item.category)}</span>
                  <span className="text-xs tracking-tight text-amber-500">{"★".repeat(item.rating)}<span className="text-slate-300 dark:text-slate-600">{"★".repeat(5 - item.rating)}</span></span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
