"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import {
  clearAuthenticatedSession,
  getAuthHeaders,
  getAuthToken,
} from "@/lib/auth";
import { normalizeLanguage } from "@/lib/languages";
import { useTranslation } from "@/components/LanguageProvider";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/offline",
  "/admin",
]);

export default function SessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setLanguage, t } = useTranslation();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (PUBLIC_ROUTES.has(pathname)) {
      setAllowed(true);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      clearAuthenticatedSession();
      setAllowed(false);
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // A previously authenticated farmer may still view cached PWA content
    // while truly offline. When the browser is online, the backend must verify
    // the signed session before any protected page is displayed.
    if (!navigator.onLine) {
      setAllowed(true);
      return;
    }

    const controller = new AbortController();
    setAllowed(false);

    fetch(`${API_URL}/auth/verify`, {
      headers: getAuthHeaders(),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session verification failed");
        const data = await response.json();
        localStorage.setItem("user_id", String(data.user.id));
        localStorage.setItem("user_name", data.user.name);
        localStorage.setItem("user_email", data.user.email);
        setLanguage(normalizeLanguage(data.user.language));
        setAllowed(true);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        clearAuthenticatedSession();
        setAllowed(false);
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      });

    return () => controller.abort();
  }, [pathname, router, setLanguage]);

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 px-6">
        <div className="rounded-2xl border border-emerald-200 bg-white px-8 py-6 font-semibold text-emerald-800 shadow-sm">
          {t("Checking your secure session...")}
        </div>
      </main>
    );
  }

  return children;
}
