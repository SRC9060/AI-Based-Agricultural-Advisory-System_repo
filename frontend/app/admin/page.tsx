"use client";

import { API_URL } from "@/lib/api";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./admin.css";

import { useTranslation } from "@/components/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { LogOut } from "lucide-react";

type Analytics = {
  users: number;
  sessions: number;
  messages: number;
  unanswered_queries: number;
  response_feedback: {
    helpful: number;
    unhelpful: number;
    satisfaction_percent: number;
  };
};

type Unanswered = { id: number; query: string; response: string; created_at: string };
type KnowledgeFile = { name: string; folder: string; size_bytes: number };

export default function AdminPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [unanswered, setUnanswered] = useState<Unanswered[]>([]);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [status, setStatus] = useState("Loading admin dashboard...");
  const [authenticating, setAuthenticating] = useState(true);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("agriadvisor_admin_key");
    localStorage.removeItem("agriadvisor_admin_key");
    setAdminKey("");
    router.replace("/admin/login");
  }, [router]);

  const loadDashboard = useCallback(async (key: string) => {
    if (!key) {
      handleLogout();
      return;
    }
    setStatus("Loading dashboard…");
    try {
      const headers = { "X-Admin-Key": key };
      const responses = await Promise.all([
        fetch(`${API_URL}/admin/analytics`, { headers }),
        fetch(`${API_URL}/admin/unanswered`, { headers }),
        fetch(`${API_URL}/admin/knowledge-base`, { headers }),
      ]);
      if (responses.some((response) => response.status === 401)) {
        handleLogout();
        return;
      }
      if (responses.some((response) => !response.ok)) {
        throw new Error("Access denied or the backend is unavailable.");
      }
      setAnalytics(await responses[0].json());
      setUnanswered(await responses[1].json());
      setFiles(await responses[2].json());
      sessionStorage.setItem("agriadvisor_admin_key", key);
      setStatus("Dashboard updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load dashboard.");
    } finally {
      setAuthenticating(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    const storedKey =
      sessionStorage.getItem("agriadvisor_admin_key") ||
      localStorage.getItem("agriadvisor_admin_key") ||
      "";
    if (!storedKey) {
      router.replace("/admin/login");
      return;
    }
    setAdminKey(storedKey);
    void loadDashboard(storedKey);
  }, [loadDashboard, router]);

  async function uploadPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("Uploading PDF…");
    const response = await fetch(`${API_URL}/admin/knowledge-base/upload`, {
      method: "POST",
      headers: { "X-Admin-Key": adminKey },
      body: data,
    });
    const result = await response.json();
    setStatus(result.message ?? result.detail ?? "Upload finished.");
    if (response.ok) {
      form.reset();
      await loadDashboard(adminKey);
    }
  }

  async function rebuildIndex() {
    setStatus("Rebuilding the knowledge index…");
    const response = await fetch(`${API_URL}/admin/knowledge-base/rebuild`, {
      method: "POST",
      headers: { "X-Admin-Key": adminKey },
    });
    const result = await response.json();
    setStatus(result.message ?? result.detail ?? "Rebuild finished.");
  }

  if (authenticating) {
    return (
      <main className="admin-shell flex items-center justify-center min-h-screen">
        <p className="text-slate-600 dark:text-slate-300 font-medium">
          {t("Verifying admin authorization...")}
        </p>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">{t("AgriAdvisor internal tool")}</p>
          <h1>{t("Admin dashboard")}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <a href="/chat">{t("Open farmer PWA")}</a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>{t("Logout")}</span>
          </button>
        </div>
      </header>

      {status && (
        <div className="w-full max-w-[1180px] mx-auto mb-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300">
          {t(status)}
        </div>
      )}

      {analytics && (
        <>
          <section className="metric-grid" aria-label={t("Usage analytics")}>
            <article><strong>{analytics.users}</strong><span>{t("Farmers")}</span></article>
            <article><strong>{analytics.sessions}</strong><span>{t("Sessions")}</span></article>
            <article><strong>{analytics.messages}</strong><span>{t("Messages")}</span></article>
            <article><strong>{analytics.unanswered_queries}</strong><span>{t("Unanswered")}</span></article>
            <article><strong>{analytics.response_feedback.satisfaction_percent}%</strong><span>{t("Satisfaction")}</span></article>
          </section>

          <div className="admin-columns">
            <section className="admin-panel">
              <h2>{t("Unanswered query log")}</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t("Question")}</th><th>{t("Logged")}</th></tr></thead>
                  <tbody>
                    {unanswered.map((item) => (
                      <tr key={item.id}>
                        <td>{item.query}</td>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!unanswered.length && <tr><td colSpan={2}>{t("No unanswered queries.")}</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <h2>{t("Knowledge base")}</h2>
              <form onSubmit={uploadPdf} className="upload-form">
                <input name="file" type="file" accept="application/pdf" required />
                <input name="folder" defaultValue="Admin_Uploads" aria-label={t("Knowledge folder")} />
                <button type="submit">{t("Upload PDF")}</button>
              </form>
              <button className="secondary-button" onClick={rebuildIndex}>{t("Rebuild search index")}</button>
              <ul className="file-list">
                {files.map((file) => (
                  <li key={`${file.folder}/${file.name}`}>
                    <span>{file.name}</span>
                    <small>{file.folder} · {(file.size_bytes / 1024).toFixed(0)} KB</small>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
