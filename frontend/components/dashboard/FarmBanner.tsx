"use client";

import { useState } from "react";
import { MessageSquare, Send, Star } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

const categories = ["Suggestion", "Bug report", "Appreciation", "Other"];

export default function FarmBanner() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Suggestion");
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitFeedback() {
    if (message.trim().length < 3) {
      setStatus(t("Please write at least 3 characters."));
      return;
    }

    const userId = localStorage.getItem("user_id");
    if (!userId) {
      setStatus(t("Please log in first."));
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("http://127.0.0.1:8000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId), message, category, rating }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to save feedback");
      setMessage("");
      setStatus(t("Thank you! Feedback saved."));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save feedback");
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/90 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="rounded-xl bg-green-100 p-2 text-green-700"><MessageSquare size={20} /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t("Help us grow better")}</h2>
          <p className="text-sm text-slate-500">{t("Share a quick suggestion or report an issue.")}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <label className="block text-sm font-semibold text-slate-700">{t("Feedback type")}
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-normal outline-none focus:border-green-600">
            {categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}
          </select>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>{t("Rate AgriAdvisor")}</span><span className="text-green-700">{rating}/5</span>
          </div>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} stars`}>
                <Star size={20} className={value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-700">{t("Your feedback")}
        <textarea value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder={t("Tell us what worked well or what we can improve...")} className="mt-1 h-24 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-base font-normal outline-none focus:border-green-600" />
      </label>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{t("Saved to your account.")}</span><span>{message.length}/500</span></div>
      <button disabled={saving} onClick={submitFeedback} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"><Send size={16} />{saving ? t("Saving...") : t("Submit feedback")}</button>
      {status && <p className="mt-2 text-xs font-medium text-green-700">{status}</p>}
    </aside>
  );
}
