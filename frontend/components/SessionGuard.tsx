"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import {
  clearAuthenticatedSession,
  getAuthToken,
} from "@/lib/auth";
import { normalizeLanguage } from "@/lib/languages";
import {
  getCurrentSession,
  saveLoginSession,
} from "@/lib/session";
import { useTranslation } from "@/components/LanguageProvider";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/offline",
  "/admin",
]);

export default function SessionGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setLanguage, t } = useTranslation();

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const [allowed, setAllowed] = useState(isPublicRoute);

  useEffect(() => {
    if (PUBLIC_ROUTES.has(pathname)) {
      setAllowed(true);
      return;
    }

  const token = getAuthToken();
  const currentSession = getCurrentSession();

  if (!token || !currentSession) {
    clearAuthenticatedSession();
    setAllowed(false);
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    return;
  }

  // If browser itself is offline, immediately trust cached session.
  if (!navigator.onLine) {
    setAllowed(true);
    return;
  }

  const controller = new AbortController();

  // Don't wait forever if the backend is stopped/unavailable.
  const timeoutId = window.setTimeout(() => {
    console.warn(
      "[SessionGuard] Backend verification timed out. Using cached session."
    );
    controller.abort();
  }, 4000);

  apiFetch(`${API_URL}/auth/verify`, {
    cache: "no-store",
    signal: controller.signal,
  })
    .then(async (response) => {
      window.clearTimeout(timeoutId);

      // 401 = token/session is genuinely invalid.
      if (response.status === 401) {
        clearAuthenticatedSession();
        setAllowed(false);
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // Any other backend error = keep existing cached session.
      if (!response.ok) {
        console.warn(
          "[SessionGuard] Auth verification unavailable. Using cached session."
        );
        setAllowed(true);
        return;
      }

      const data = await response.json();

      saveLoginSession(
        {
          userId: data.user.id,
          userName: data.user.name,
          userEmail: data.user.email,
          profileCompleted: currentSession.profileCompleted,
        },
        currentSession.rememberMe
      );

      const currentLocalLang =
        typeof window !== "undefined"
          ? localStorage.getItem("language")
          : null;

      if (!currentLocalLang && data.user?.language) {
        setLanguage(normalizeLanguage(data.user.language));
      }

      setAllowed(true);
    })
    .catch((error) => {
      window.clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        console.warn(
          "[SessionGuard] Backend unavailable/timed out. Using cached session."
        );
        setAllowed(true);
        return;
      }

      console.warn(
        "[SessionGuard] Backend unavailable. Continuing with cached session.",
        error
      );

      setAllowed(true);
    });

  return () => {
    window.clearTimeout(timeoutId);
    controller.abort();
  };
}, [pathname, router, setLanguage]);

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 dark:bg-slate-950 px-6">
        <div className="rounded-2xl border border-emerald-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-6 font-semibold text-emerald-800 dark:text-emerald-400 shadow-sm">
          {t("Checking your secure session...")}
        </div>
      </main>
    );
  }

  return children;
}