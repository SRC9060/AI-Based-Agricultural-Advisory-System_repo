"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { useTranslation } from "@/components/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { Lock, ShieldAlert, ArrowLeft, KeyRound } from "lucide-react";
import "../admin.css";

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminKey.trim()) {
      setError(t("Please enter the Admin API key."));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/admin/analytics`, {
        headers: { "X-Admin-Key": adminKey.trim() },
      });

      if (response.status === 401) {
        throw new Error(t("Invalid Admin API key. Access denied."));
      }
      if (response.status === 503) {
        throw new Error(t("Admin access is not configured on server."));
      }
      if (!response.ok) {
        throw new Error(t("Could not connect to admin server."));
      }

      // Valid key
      sessionStorage.setItem("agriadvisor_admin_key", adminKey.trim());
      localStorage.setItem("agriadvisor_admin_key", adminKey.trim());
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Authentication failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <a
            href="/chat"
            className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft size={16} />
            <span>{t("Back to App")}</span>
          </a>
          <LanguageSelector />
        </div>

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("Admin Portal Access")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("Enter authorized Admin API key to access management dashboard.")}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 flex items-center gap-3 text-sm font-medium">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="admin-key-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2"
            >
              {t("Admin API Key")}
            </label>
            <div className="relative">
              <input
                id="admin-key-input"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder={t("Enter secret admin key")}
                required
                className="w-full px-4 py-3 pl-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <KeyRound
                size={18}
                className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? t("Authenticating...") : t("Login to Admin Dashboard")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t("Protected internal administrative area.")}
          </p>
        </div>
      </div>
    </main>
  );
}
