"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AppSession {
  userId: string;
  userName: string;
  userEmail: string;
  profileCompleted: boolean;
  rememberMe: boolean;
}

export interface LoginSessionInput {
  userId: string | number;
  userName?: string;
  userEmail?: string;
  profileCompleted: boolean;
}

const SESSION_KEYS = [
  "logged_in",
  "remember_me",
  "user_id",
  "user_name",
  "user_email",
  "profile_completed",
] as const;

function readSession(storage: Storage, rememberMe: boolean): AppSession | null {
  const userId = storage.getItem("user_id");
  if (!userId) return null;

  return {
    userId,
    userName: storage.getItem("user_name") || "Farmer",
    userEmail: storage.getItem("user_email") || "",
    profileCompleted: storage.getItem("profile_completed") === "true",
    rememberMe,
  };
}

export function getRememberedSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  if (
    localStorage.getItem("remember_me") !== "true" ||
    localStorage.getItem("logged_in") !== "true"
  ) {
    return null;
  }

  return readSession(localStorage, true);
}

export function getCurrentSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  return getRememberedSession() || readSession(sessionStorage, false);
}

export function getCurrentUserId(): string | null {
  return getCurrentSession()?.userId ?? null;
}

export function getLoginRedirectPath(session: AppSession): "/dashboard" | "/profile" {
  return session.profileCompleted ? "/dashboard" : "/profile";
}

export function getRememberedLoginRedirectPath(): "/dashboard" | "/profile" | null {
  const session = getRememberedSession();
  return session ? getLoginRedirectPath(session) : null;
}

export function saveLoginSession(session: LoginSessionInput, rememberMe: boolean) {
  if (typeof window === "undefined") return;

  clearSession();

  const targetStorage = rememberMe ? localStorage : sessionStorage;
  targetStorage.setItem("user_id", String(session.userId));
  targetStorage.setItem("user_name", session.userName || "Farmer");
  targetStorage.setItem("user_email", session.userEmail || "");
  targetStorage.setItem("profile_completed", String(session.profileCompleted));

  if (rememberMe) {
    localStorage.setItem("remember_me", "true");
    localStorage.setItem("logged_in", "true");
  }
}

export function updateProfileCompleted(profileCompleted: boolean) {
  if (typeof window === "undefined") return;

  const storage = getRememberedSession() ? localStorage : sessionStorage;
  storage.setItem("profile_completed", String(profileCompleted));
}

export function clearSession() {
  if (typeof window === "undefined") return;

  for (const key of SESSION_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function useRequireSession() {
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const currentSession = getCurrentSession();

    if (!currentSession) {
       setCheckingSession(false);
      router.replace("/login");
      return;
    }

    setSession(currentSession);
    setCheckingSession(false);
  }, [router]);

  return { session, checkingSession };
}
