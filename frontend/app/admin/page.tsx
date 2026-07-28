"use client";


import { API_URL } from "@/lib/api";
import { FormEvent, useCallback, useEffect, useState } from "react";
import "./admin.css";

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
  const [adminKey, setAdminKey] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [unanswered, setUnanswered] = useState<Unanswered[]>([]);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [status, setStatus] = useState("Enter the admin API key to load dashboard data.");

  useEffect(() => {
    setAdminKey(sessionStorage.getItem("agriadvisor_admin_key") ?? "");
  }, []);

  const loadDashboard = useCallback(async (key = adminKey) => {
    if (!key) return;
    setStatus("Loading dashboard…");
    try {
      const headers = { "X-Admin-Key": key };
      const responses = await Promise.all([
        fetch(`${API_URL}/admin/analytics`, { headers }),
        fetch(`${API_URL}/admin/unanswered`, { headers }),
        fetch(`${API_URL}/admin/knowledge-base`, { headers }),
      ]);
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
    }
  }, [adminKey]);

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
      await loadDashboard();
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

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">AgriAdvisor internal tool</p>
          <h1>Admin dashboard</h1>
        </div>
        <a href="/chat">Open farmer PWA</a>
      </header>

      <section className="admin-auth">
        <label htmlFor="admin-key">Admin API key</label>
        <input
          id="admin-key"
          type="password"
          value={adminKey}
          onChange={(event) => setAdminKey(event.target.value)}
          placeholder="Enter ADMIN_API_KEY"
        />
        <button onClick={() => loadDashboard()}>Load dashboard</button>
        <span role="status">{status}</span>
      </section>

      {analytics && (
        <>
          <section className="metric-grid" aria-label="Usage analytics">
            <article><strong>{analytics.users}</strong><span>Farmers</span></article>
            <article><strong>{analytics.sessions}</strong><span>Sessions</span></article>
            <article><strong>{analytics.messages}</strong><span>Messages</span></article>
            <article><strong>{analytics.unanswered_queries}</strong><span>Unanswered</span></article>
            <article><strong>{analytics.response_feedback.satisfaction_percent}%</strong><span>Satisfaction</span></article>
          </section>

          <div className="admin-columns">
            <section className="admin-panel">
              <h2>Unanswered query log</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Question</th><th>Logged</th></tr></thead>
                  <tbody>
                    {unanswered.map((item) => (
                      <tr key={item.id}>
                        <td>{item.query}</td>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!unanswered.length && <tr><td colSpan={2}>No unanswered queries.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <h2>Knowledge base</h2>
              <form onSubmit={uploadPdf} className="upload-form">
                <input name="file" type="file" accept="application/pdf" required />
                <input name="folder" defaultValue="Admin_Uploads" aria-label="Knowledge folder" />
                <button type="submit">Upload PDF</button>
              </form>
              <button className="secondary-button" onClick={rebuildIndex}>Rebuild search index</button>
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
